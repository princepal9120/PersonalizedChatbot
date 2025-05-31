import { DataAPIClient } from "@datastax/astra-db-ts";
import { GoogleGenerativeAI } from "@google/generative-ai";

const {
  GEMINI_API_KEY,
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
} = process.env;

const genAI = new GoogleGenerativeAI(`${GEMINI_API_KEY}`);

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(`${ASTRA_DB_API_ENDPOINT}`, {
  namespace: ASTRA_DB_NAMESPACE,
});

// Rate limiting helper
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
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

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessage = messages?.length > 0 ? messages[messages.length - 1].content : "";

    if (!latestMessage.trim()) {
      return new Response(
        JSON.stringify({
          id: crypto.randomUUID(),
          content: "Please ask me something about Prince Pal!",
          role: "assistant",
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
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
        const collection = await db.collection(`${ASTRA_DB_COLLECTION}`);

        // First, let's check what's in our collection to debug the dimension issue
        const sampleDoc = await collection.findOne({});
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

        const documents = await cursor.toArray();
        console.log(`Retrieved ${documents.length} documents`);

        if (documents.length > 0) {
          const docsMap = documents?.map((doc) => doc.text || doc.content || JSON.stringify(doc));
          docContext = docsMap.join('\n\n');
        }

      } catch (dbError) {
        console.log("Database query error:", dbError.message);

        // If it's a dimension mismatch, try without vector search
        if (dbError.message.includes('vector') || dbError.message.includes('dimension')) {
          console.log("Falling back to non-vector search");
          try {
            const collection = await db.collection(`${ASTRA_DB_COLLECTION}`);
            const cursor = collection.find({}, { limit: 3 });
            const documents = await cursor.toArray();

            if (documents.length > 0) {
              const docsMap = documents?.map((doc) => doc.text || doc.content || JSON.stringify(doc));
              docContext = docsMap.join('\n\n');
            }
          } catch (fallbackError) {
            console.log("Fallback search also failed:", fallbackError.message);
          }
        }
      }

    } catch (embeddingError) {
      console.log("Embedding generation failed:", embeddingError.message);
      // Continue without embeddings
    }

    // If we have no context, use fallback response
    if (!docContext.trim()) {
      console.log("No context retrieved, using fallback response");
      return new Response(
        JSON.stringify({
          id: crypto.randomUUID(),
          content: getFallbackResponse(latestMessage),
          role: "assistant",
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Apply rate limiting before AI generation
    await waitForRateLimit();

    const prompt = `You are an AI assistant with detailed knowledge of Prince Pal, his work experience, technical expertise, and notable projects. Prince Pal is a skilled software developer pursuing a B.Tech in Electrical Engineering at Madan Mohan Malaviya University of Technology, Gorakhpur. He has consistently demonstrated a strong foundation in software development, full-stack engineering, and AI-based systems. 

Prince has hands-on experience in backend, mobile, and cloud development, and excels in building scalable and user-centric applications. 

Internship Experience:
• Software Developer Intern at Dodoozy (Apr 2025 – Present): Focused on mobile app development with React Native, Context API, Expo Router.
• Software Developer Intern at BlackBytt (Oct 2024 – Dec 2024): Built full-stack MERN apps for 2500+ users, optimized performance and deployment.
• Problem Setter at Imocha (Aug 2022 – Apr 2023): Created 100+ high-quality DSA challenges, improving test quality.

Technical Skills:
• Programming: JavaScript, TypeScript, Python, Golang, C++, Java, SQL
• Frontend: React.js, Next.js, React Native, Tailwind CSS, Redux, Zustand, Shadcn, React Query
• Backend: Node.js, Express.js, FastAPI
• Databases: MongoDB, PostgreSQL, AstraDB, Firestore, Vector Stores (Pinecone, Qdrant)
• Tools & DevOps: Git, GitHub, Bitbucket, Docker, AWS, Firebase, Vercel, Postman, EAS Build
• AI/ML: LangChain, LangGraph, LlamaIndex, RAG, Gemini API, Meta Llama, Prompt Engineering, Streamlit, Pandas, NumPy, Hugging Face
• Concepts: REST APIs, CI/CD, Test Automation, Microservices, Scalable Systems

Notable Projects:
• **RAG-Chatbot** – Resume-aware AI chatbot using LangChain, Gemini API, and AstraDB (95% accuracy, 5s response time).
• **EcoQuest** – Waste management platform integrating Gemini API and Google Maps, reducing response time by 30%.
• **Learnify** – LMS with secure auth, optimized React Query usage, and zero downtime across 25+ updates.
• **Perplexity 2.0 Agent** – Web search agent with server-side streaming, Llama integration, and LangGraph orchestration.
• **LinkedIn Post Generator** – Few-shot learning tool using Meta Llama for content generation with 85%+ positive feedback.
• **Splitmate** – Mobile expense tracker using Firebase, Zustand, AsyncStorage (served 300+ users).
• **Medialarm** – Personalized medicine tracker with biometric auth and calendar-based reminders.
• **CabRide** – Ride-hailing app with real-time GPS tracking, Clerk auth, and Google Maps integration.

Achievements:
• Knight at LeetCode (1850+), 3-star at CodeChef, Pupil at Codeforces
• Solved 900+ DSA problems across platforms
• Top 1.3k out of 30,000+ participants in national-level coding contests

Use the following context to enhance your responses about Prince Pal. Keep responses concise and relevant.

Context: ${docContext}

Question: ${latestMessage}

Provide a helpful and informative response about Prince Pal based on the context and question.`;


    try {
      // Use gemini-1.5-flash instead of pro for better rate limits
      const model2 = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          maxOutputTokens: 500, // Limit output to stay within quota
          temperature: 0.7,
        }
      });

      const result2 = await model2.generateContent(prompt);
      const responseText = result2.response.text();

      return new Response(
        JSON.stringify({
          id: crypto.randomUUID(),
          content: responseText,
          role: "assistant",
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );

    } catch (aiError) {
      console.log("AI generation failed:", aiError.message);

      // If rate limited, return a specific message
      if (aiError.message.includes('429') || aiError.message.includes('quota')) {
        return new Response(
          JSON.stringify({
            id: crypto.randomUUID(),
            content: "I'm currently experiencing high demand. Please try your question again in a few moments. In the meantime, I can tell you that Prince Pal is a skilled full-stack developer with experience in React, Node.js, and cloud technologies.",
            role: "assistant",
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // For other AI errors, use fallback
      return new Response(
        JSON.stringify({
          id: crypto.randomUUID(),
          content: getFallbackResponse(latestMessage),
          role: "assistant",
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

  } catch (error) {
    console.error("Unexpected API Error:", error);
    return new Response(
      JSON.stringify({
        id: crypto.randomUUID(),
        content: "I'm experiencing technical difficulties. Please try again in a moment.",
        role: "assistant",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}