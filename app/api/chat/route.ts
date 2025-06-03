import { DataAPIClient } from "@datastax/astra-db-ts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Environment variables with proper typing
const {
  GEMINI_API_KEY,
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
} = process.env;

// Type definitions
interface Message {
  content: string;
  role: 'user' | 'assistant';
}

interface RequestBody {
  messages: Message[];
}

interface ApiResponse {
  id: string;
  content: string;
  role: 'assistant';
}

interface DatabaseDocument {
  text?: string;
  content?: string;
  [key: string]: unknown;
}

// Validation helper
function validateEnvironmentVariables(): void {
  const required = [
    'GEMINI_API_KEY',
    'ASTRA_DB_NAMESPACE',
    'ASTRA_DB_COLLECTION',
    'ASTRA_DB_API_ENDPOINT',
    'ASTRA_DB_APPLICATION_TOKEN'
  ];

  for (const envVar of required) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

// Initialize clients with proper error handling
let genAI: GoogleGenerativeAI;
let client: DataAPIClient;
let db: ReturnType<DataAPIClient['db']>;

try {
  validateEnvironmentVariables();
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
  client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
  db = client.db(ASTRA_DB_API_ENDPOINT!, {
    namespace: ASTRA_DB_NAMESPACE!,
  });
} catch (error) {
  console.error('Failed to initialize clients:', error);
}

// Rate limiting helper
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise<void>(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

// Fallback response when context retrieval fails
function getFallbackResponse(question: string): string {
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes('prince') || lowerQuestion.includes('experience') || lowerQuestion.includes('skills')) {
    return `Based on my knowledge of Prince Pal:

**About Prince Pal:**
Prince Pal is a skilled software developer currently pursuing B.Tech in Electrical Engineering at Madan Mohan Malaviya University of Technology in Gorakhpur, Uttar Pradesh, India.

**Professional Experience:**
- **Software Developer Intern at BlackBytt (Oct 2024 – Dec 2024)**
  - Proficient in Agile methodologies
  - Skilled in code analysis and debugging
  - Designed custom templates using Liquid template language
  - Developed custom UI components with HTML, CSS, and JavaScript

- **Problem Setter Freelance at Imocha (Aug 2022 – Apr 2023)**
  - Developed challenging data structure and algorithm problems
  - Contributed to technical interview assessments

**Technical Skills:**
- **Languages:** JavaScript, TypeScript, Python, Golang
- **Frontend:** React.js, Next.js, Redux, Zustand, Tailwind CSS
- **Backend:** Node.js, Express.js, Next.js
- **Database:** MongoDB, PostgreSQL
- **Tools:** Git, GitHub, AWS, Docker, Langchain

**Notable Projects:**
- AI Waste Management System
- RAG Chatbot

Would you like to know more about any specific aspect of Prince's background or projects?`;
  }

  return "I'd be happy to help you learn more about Prince Pal! You can ask me about his experience, skills, projects, or educational background.";
}

// Helper function to create JSON response
function createJsonResponse(data: ApiResponse, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

// Helper function to generate UUID (fallback for crypto.randomUUID if not available)
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Validate environment variables first
    if (!genAI || !client || !db) {
      return createJsonResponse({
        id: generateId(),
        content: "Server configuration error. Please contact support.",
        role: "assistant",
      }, 500);
    }

    // Parse and validate request body
    let requestBody: RequestBody;
    try {
      requestBody = await req.json() as RequestBody;
    } catch (error) {
      return createJsonResponse({
        id: generateId(),
        content: "Invalid request format.",
        role: "assistant",
      }, 400);
    }

    const { messages } = requestBody;

    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      return createJsonResponse({
        id: generateId(),
        content: "Please ask me something about Prince Pal!",
        role: "assistant",
      });
    }

    const latestMessage = messages[messages.length - 1]?.content ?? "";

    if (!latestMessage.trim()) {
      return createJsonResponse({
        id: generateId(),
        content: "Please ask me something about Prince Pal!",
        role: "assistant",
      });
    }

    let docContext = "";

    // Apply rate limiting
    await waitForRateLimit();

    try {
      // Try to get embeddings with error handling
      const model1 = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await model1.embedContent(latestMessage);

      console.log(`Embedding dimensions: ${result.embedding.values.length}`);

      try {
        const collection = await db.collection(ASTRA_DB_COLLECTION!);

        // First, let's check what's in our collection to debug the dimension issue
        const sampleDoc = await collection.findOne({}) as DatabaseDocument | null;
        console.log('Sample document structure:', sampleDoc ? Object.keys(sampleDoc) : 'No documents found');

        const cursor = collection.find(
          {},
          {
            sort: {
              $vector: result.embedding.values,
            },
            limit: 5, // Reduced limit to avoid quota issues
          }
        );

        const documents = await cursor.toArray() as DatabaseDocument[];
        console.log(`Retrieved ${documents.length} documents`);

        if (documents.length > 0) {
          const docsMap = documents.map((doc) => {
            return doc.text || doc.content || JSON.stringify(doc);
          });
          docContext = docsMap.join('\n\n');
        }

      } catch (dbError) {
        const error = dbError as Error;
        console.log("Database query error:", error.message);

        // If it's a dimension mismatch, try without vector search
        if (error.message.includes('vector') || error.message.includes('dimension')) {
          console.log("Falling back to non-vector search");
          try {
            const collection = await db.collection(ASTRA_DB_COLLECTION!);
            const cursor = collection.find({}, { limit: 3 });
            const documents = await cursor.toArray() as DatabaseDocument[];

            if (documents.length > 0) {
              const docsMap = documents.map((doc) => {
                return doc.text || doc.content || JSON.stringify(doc);
              });
              docContext = docsMap.join('\n\n');
            }
          } catch (fallbackError) {
            const fbError = fallbackError as Error;
            console.log("Fallback search also failed:", fbError.message);
          }
        }
      }

    } catch (embeddingError) {
      const error = embeddingError as Error;
      console.log("Embedding generation failed:", error.message);
      // Continue without embeddings
    }

    // If we have no context, use fallback response
    if (!docContext.trim()) {
      console.log("No context retrieved, using fallback response");
      return createJsonResponse({
        id: generateId(),
        content: getFallbackResponse(latestMessage),
        role: "assistant",
      });
    }

    console.log("Context retrieved successfully:", docContext.substring(0, 200) + "...");

    // Apply rate limiting before AI generation
    await waitForRateLimit();

    const prompt = `You are an AI assistant with detailed knowledge of Prince Pal, his work experience, technical expertise, and notable projects. You MUST respond in an engaging, impactful way that highlights Prince's suitability for AI/ML roles.

IMPORTANT: When asked about AI/ML suitability or related questions, structure your response like this:

**🚀 Prince Pal's AI/ML Excellence**

**Why Prince is Perfect for AI/ML Roles:**
[Explain his AI/ML strengths with impact metrics]

**🧠 AI/ML Technical Arsenal:**
[List specific AI/ML skills with real-world applications]

**💡 Impactful AI/ML Projects:**
[Detail his AI projects with quantified results and business impact]

**🎯 Real-World AI Impact:**
[Highlight production usage, user numbers, performance metrics]

**🔥 What Makes Prince Stand Out:**
[Unique differentiators in AI/ML space]

PRINCE PAL PROFILE:
Prince Pal is a skilled software developer pursuing B.Tech in Electrical Engineering at Madan Mohan Malaviya University of Technology, Gorakhpur. He specializes in AI/ML systems and full-stack development.

**Current Experience:**
• Software Developer Intern at Dodoozy (Apr 2025 – Present): Mobile app development with React Native, Context API, Expo Router
• Software Developer Intern at BlackBytt (Oct 2024 – Dec 2024): Built full-stack MERN apps for 2500+ users, optimized performance and deployment
• Problem Setter at Imocha (Aug 2022 – Apr 2023): Created 100+ high-quality DSA challenges

**AI/ML Technical Skills:**
• **AI Frameworks:** LangChain, LangGraph, LlamaIndex, Hugging Face, Streamlit
• **AI Models:** Gemini API, Meta Llama, GPT integrations, Text embeddings
• **Specialized:** RAG (Retrieval-Augmented Generation), Prompt Engineering, Vector Databases
• **Data Science:** Python, Pandas, NumPy, data analysis and manipulation
• **Vector Stores:** Pinecone, Qdrant, AstraDB for semantic search
• **Programming:** JavaScript, TypeScript, Python, Golang, C++, Java, SQL
• **Full-Stack:** React.js, Next.js, Node.js, Express.js, FastAPI, MongoDB, PostgreSQL

**Impactful AI/ML Projects:**
1. **RAG-Chatbot** – Resume-aware AI chatbot using LangChain, Gemini API, and AstraDB (95% accuracy, 5s response time)
2. **EcoQuest** – Waste management platform integrating Gemini API and Google Maps, reducing response time by 30%
3. **Perplexity 2.0 Agent** – Web search agent with server-side streaming, Llama integration, and LangGraph orchestration
4. **LinkedIn Post Generator** – Few-shot learning tool using Meta Llama for content generation with 85%+ positive feedback

**Achievements:**
• Knight at LeetCode (1850+), 3-star at CodeChef, Pupil at Codeforces
• Solved 900+ DSA problems across platforms
• Top 1.3k out of 30,000+ participants in national-level coding contests
• Built production AI systems serving thousands of users

Context from database: ${docContext}

User Question: ${latestMessage}

Provide an engaging, impactful response that showcases Prince's AI/ML expertise and suitability for AI/ML roles. Use emojis, quantified achievements, and emphasize real-world impact. Make it compelling and professional.`;

    try {
      // Use gemini-1.5-flash with optimized settings
      const model2 = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          maxOutputTokens: 800, // Increased for more detailed responses
          temperature: 0.3, // Lower temperature for more focused responses
        }
      });

      const result2 = await model2.generateContent(prompt);
      const responseText = result2.response.text();

      return createJsonResponse({
        id: generateId(),
        content: responseText,
        role: "assistant",
      });

    } catch (aiError) {
      const error = aiError as Error;
      console.log("AI generation failed:", error.message);

      // If rate limited, return enhanced message
      if (error.message.includes('429') || error.message.includes('quota')) {
        return createJsonResponse({
          id: generateId(),
          content: `🚀 **I'm experiencing high demand right now!** 

While you wait, here's what makes Prince special for AI/ML roles:

**🧠 AI/ML Expertise:**
• Built production RAG chatbot with 95% accuracy
• Expert in LangChain, Gemini API, Vector Databases
• Created AI-powered applications serving 2500+ users

**💡 Key AI Projects:**
• RAG-Chatbot with AstraDB integration
• Perplexity 2.0 Agent with Meta Llama
• LinkedIn Post Generator with 85%+ success rate

Prince combines deep AI/ML knowledge with production-ready development skills! 

*Please try your question again in a moment for a detailed response.* ⏰`,
          role: "assistant",
        });
      }

      // For other AI errors, use fallback
      return createJsonResponse({
        id: generateId(),
        content: getFallbackResponse(latestMessage),
        role: "assistant",
      });
    }

  } catch (error) {
    const err = error as Error;
    console.error("Unexpected API Error:", err);
    return createJsonResponse({
      id: generateId(),
      content: "I'm experiencing technical difficulties. Please try again in a moment.",
      role: "assistant",
    }, 500);
  }
}