'use client'

import { useState, useEffect, useRef, FormEvent, ChangeEvent, KeyboardEvent } from "react";
import Image from "next/image";
import { Send, Loader2 } from "lucide-react";
import logo from "./assets/logo.png";
import ChatMessage from "@/components/ChatMessage";
import LoadingMessage from "@/components/LoadingMessage";
import SuggestionsSection from "@/components/SuggestionsSection";
import { ChatHeader } from "@/components/chat-header";
import { MessageInput } from '@/components/message-input'

const predefinedQuestions = [
  { id: 1, text: "What is Prince's work experience?", icon: "💼" },
  { id: 2, text: "Tell me about Prince's technical skills", icon: "💻" },
  { id: 3, text: "What projects has Prince worked on?", icon: "🚀" },
  { id: 4, text: "What are Prince's educational qualifications?", icon: "🎓" },
]

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = "inherit";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  };

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return;

    const newMessage: Message = {
      id: crypto.randomUUID(),
      content: messageContent,
      role: "user",
    };
    setMessages((prevMessages) => [...prevMessages, newMessage]);

    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, newMessage] }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response from the server");
      }

      const assistantMessage: Message = await response.json();
      setMessages((prevMessages) => [...prevMessages, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLTextAreaElement>) => {
    setInput("");
    event.preventDefault();
    await sendMessage(input);
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

//   return (
//     <main className="flex flex-col items-center min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100 p-4">
//       <div className="w-full max-w-4xl flex flex-col h-screen">
//         {/* Header */}
//         <ChatHeader/>

//         {/* Chat Container */}
//         <div
//           ref={chatContainerRef}
//           className="flex-grow bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg overflow-y-auto mb-4 p-4 transition-all
//             [&::-webkit-scrollbar]:w-2
//             [&::-webkit-scrollbar-track]:bg-gray-800/20
//             [&::-webkit-scrollbar-thumb]:bg-blue-700/40
//             [&::-webkit-scrollbar-thumb:hover]:bg-blue-600/60
//             hover:[&::-webkit-scrollbar-thumb]:bg-blue-600/50"
//         >
//           {messages.length === 0 ? (
//             <SuggestionsSection onPromptSubmit={sendMessage} />
//           ) : (
//             <div className="space-y-4">
//               {messages.map((message, index) => (
//                 <ChatMessage 
//                 key={message.id || `fallback-key-${index}`}
//                 message={message}
//               />
              
//               ))}
//               {isLoading && <LoadingMessage />}
//             </div>
//           )}
//         </div>

//         {/* Input Form */}
//         <form
//           onSubmit={handleSubmit}
//           className="relative bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-4"
//         >
//           <textarea
//             ref={inputRef}
//             value={input}
//             onChange={handleInputChange}
//             onKeyDown={handleKeyPress}
//             placeholder="Type your message..."
//             className="w-full px-4 py-3 pr-12 bg-gray-700/50 text-gray-100 placeholder-gray-400 
//               border border-gray-600 rounded-lg resize-none min-h-[52px] max-h-[200px]
//               focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
//               transition-all duration-200"
//             rows={1}
//           />
//           <button
//             type="submit"
//             disabled={isLoading || !input.trim()}
//             className="absolute right-6 bottom-6 p-2 text-blue-400 hover:text-blue-300 
//               disabled:text-gray-500 transition-colors duration-200"
//           >
//             {isLoading ? (
//               <Loader2 className="w-5 h-5 animate-spin" />
//             ) : (
//               <Send className="w-5 h-5" />
//             )}
//           </button>
//         </form>
//       </div>
//     </main>
//   );
// }

return (
  <div className="min-h-screen w-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center p-4">
    {/* Animated background */}
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-fuchsia-400 opacity-20 blur-[100px]" />
      <div className="absolute left-60 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-400 opacity-20 blur-[100px]" />
    </div>

    <div className="w-full max-w-4xl ">
      <div className="rounded-2xl border border-gray-200 bg-white/10 backdrop-blur-xl shadow-[0_0_1px_1px_rgba(0,0,0,0.1)] overflow-hidden">
        <ChatHeader />
        <SuggestionsSection 
          questions={predefinedQuestions} 
          // onQuestionClick={handleQuestionClick}
        />
        
        <MessageInput onSendMessage={sendMessage} />
      </div>
    </div>
  </div>
)
}