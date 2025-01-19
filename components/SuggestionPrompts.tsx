import { MessageCircle } from 'lucide-react'

interface SuggestionPrompt {
  text: string
  onClick: (text: string) => void
}

export function SuggestionPrompts({ prompts }: { prompts: SuggestionPrompt[] }) {
  return (
    <div className="grid gap-2">
      {prompts.map((prompt, index) => (
        <button
          key={index}
          onClick={() => prompt.onClick(prompt.text)}
          className="flex items-center gap-2 rounded-lg bg-secondary/50 px-4 py-3 text-left text-sm text-secondary-foreground transition-colors hover:bg-secondary/70"
        >
          <MessageCircle className="h-4 w-4 text-blue-400" />
          {prompt.text}
        </button>
      ))}
    </div>
  )
}


