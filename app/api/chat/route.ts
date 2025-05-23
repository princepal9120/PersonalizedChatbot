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

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessage =
      messages?.length > 0 ? messages[messages.length - 1].content : "";

    let docContext = "";
    const model1 = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const model2 = genAI.getGenerativeModel({ model: "models/gemini-1.5-pro" });

    const result = await model1.embedContent(latestMessage);

    try {
      const collection = await db.collection(`${ASTRA_DB_COLLECTION}`);
      const cursor = collection.find(
        {},
        {
          sort: {
            $vector: result.embedding.values,
          },
          limit: 10,
        }
      );

      const documents = await cursor.toArray();
      const docsMap = documents?.map((doc) => doc.text);
      docContext = JSON.stringify(docsMap);
    } catch (error) {
      console.log("Error querying db...", error);
      docContext = "";
    }

    const prompt = `You are an AI assistant with detailed knowledge of Prince Pal, his work experience and projects. Prince Pal is a skilled software developer pursuing a B.Tech in Electrical Engineering  at Madan Mohan Malaviya University of Technolgy. He lives in Gorakhpur, Uttar Pradesh, India. With hands-on experience in backend development, cloud deployment, and full-stack projects, he has contributed to building scalable systems like the Ai Waste Management and RAG Chatbot. 
   
Prince’s Internship Experience
    Software Developer Intern
    Company: BlackBytt
    Duration: Oct 2024 – Dec 2024
    Role: Software Developer Intern
  • Proficient in Agile methodologies for project management and iterative development.
  • Skilled in code analysis and debugging to identify and resolve issues efficiently.
  • Designed custom templates based on client needs using Liquid template language.
  • Developed and maintained custom UI components with HTML, CSS, and JavaScript.

    Problem Setter Freelance
    Company: Imocha
    Duration: Aug 2022– Apr 2023
    Role: Problem Setter Freelance
  • Developed a wide range of challenging data structure and algorithm problems for technical assessments.
  • Employed debugging techniques to identify and fix errors, ensuring a bug-free user experience.
  • Contributed to the creation of high-quality assessment content for technical interviews.  


Prince’s Technical Skills
    Programming Languages: JavaScript, TypeScript, Python, Golang
    Frontend Development: React.js, Next.js, Redux, Zustand, Tailwind CSS
    Backend Development: Node.js, Express.js, Next.js
    Database Management: MongoDB, PostgreSQL, 
    Developer Tools: Git, GitHub, AWS, Docker, Langchain



    Use the following context to enhance your responses about Prince Pal. The context will include the most recent data gathered from various sources, like github, resume, twitter, etc.  
If the context does not contain the required information, respond based on your prior knowledge without referencing the source of the information.  
Format all responses using markdown where appropriate and avoid returning images.  
----------------  
START CONTEXT  
${docContext}  
END CONTEXT  
----------------  
QUESTION: ${latestMessage}  
----------------
    `;

    const result2 = await model2.generateContent(prompt);
    const responseText = result2.response.text();

    // Return the response with preserved formatting
    return new Response(
      JSON.stringify({
        id: crypto.randomUUID(),
        content: responseText.replace(/\n/g, "\\n"), // Preserve newlines by escaping them
        role: "assistant",
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("API Error:", error);
    return new Response(
      JSON.stringify({
        id: crypto.randomUUID(),
        content: "Sorry, I encountered an error processing your request.",
        role: "assistant",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}
