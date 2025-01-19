
'use client'

import { useState, useEffect, useRef, FormEvent, ChangeEvent, KeyboardEvent } from "react";
import { Bot, Loader2, Send } from 'lucide-react'
import  ChatMessage  from "@/components/ChatMessage"
import  LoadingMessage from "@/components/LoadingMessage"
import { SuggestionsSection } from "@/components/SuggestionsSection"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
type Message ={
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
  // const [messages, setMessages] = useState<Array<{ text: string; isBot: boolean }>>([])
  // const [input, setInput] = useState("")
  // const [isLoading, setIsLoading] = useState(false)

  

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 relative z-10">
      <div className="mb-8 flex items-center justify-center gap-2">
        <Bot className="h-8 w-8 text-blue-400" />
        <h1 className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-2xl font-bold text-transparent">
          RAG Chatbot
        </h1>
      </div>

      <div className="mb-8 text-center">
        <h2 className="flex items-center justify-center gap-2 text-xl font-semibold text-blue-400">
          <Bot className="h-6 w-6" />
          Hi, I&apos;m Prince&apos;s AI Assistant
        </h2>
      </div>

      <div ref={chatContainerRef}>
      {messages.length === 0 ? (
        <SuggestionsSection onPromptSubmit={sendMessage} />
      ) : (
        <div className="space-y-4">
          {messages.map((message, index) => (
            <ChatMessage key={message.id || `fallback-key-${index}`}
                            message={message} />
          ))}
          {isLoading && (
            <div className="ml-11">
              <LoadingMessage />
            </div>
          )}
        </div>
      )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            className="bg-secondary"
            
          />
          <Button 
          type="submit"
            
            disabled={!input.trim() || isLoading}
            size="icon"
          >
             {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </form>
      </div>
    </main>
  )
}


