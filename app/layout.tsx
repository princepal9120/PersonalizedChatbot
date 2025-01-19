import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RAG Chatbot",
  description: "An AI-powered chatbot with RAG capabilities",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} relative min-h-screen overflow-x-hidden`}>
  <div className="animated-bg fixed inset-0" />
  <div className="noise-overlay fixed inset-0" />
  <div className="grid-background fixed inset-0" />
  <div className="floating-element fixed top-20 left-10 w-20 h-20 bg-blue-500/10 rounded-full blur-3xl" />
  <div className="floating-element fixed bottom-20 right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" style={{ animationDelay: '-2s' }} />
  <div className="floating-element fixed top-1/2 right-1/4 w-24 h-24 bg-pink-500/10 rounded-full blur-3xl" style={{ animationDelay: '-4s' }} />
  <div className="relative z-10">
    {children}
  </div>
</body>
    </html>
  )
}

