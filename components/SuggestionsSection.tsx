
import React from 'react';
import { MessageCircle, Bot } from 'lucide-react';

interface SuggestionProps {
  onPromptSubmit: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
  "What is Prince's work experience?",
  "Tell me about Prince's technical skills",
  "What projects has Prince worked on?",
  "What are Prince's educational qualifications?"
];

const SuggestionPrompt = ({ text, onClick }: { text: string; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="w-full bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 
    text-gray-200 p-4 rounded-xl transition-all duration-200 
    border border-gray-600/30 hover:border-gray-500
    transform hover:-translate-y-0.5 hover:shadow-lg"
  >
    <div className="flex items-center space-x-3">
      <MessageCircle className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
      <span className="text-sm font-medium">{text}</span>
    </div>
  </button>
);

export const SuggestionsSection: React.FC<SuggestionProps> = ({ onPromptSubmit }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-4">
      
      
      <div className="grid grid-cols-1 gap-3 w-full">
        {SUGGESTED_PROMPTS.map((prompt, index) => (
          <SuggestionPrompt
            key={index}
            text={prompt}
            onClick={() => onPromptSubmit(prompt)}
          />
        ))}
      </div>
      
      <p className="text-sm text-gray-400 mt-6">
        Choose a question or type your own below
      </p>
    </div>
  );
};

