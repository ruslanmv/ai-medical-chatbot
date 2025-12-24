"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip } from "lucide-react";
import { MessageBubble } from "../chat/MessageBubble";
import type { ChatMessage } from "@/lib/hooks/useChat";

interface ChatViewProps {
  messages: ChatMessage[];
  isTyping: boolean;
  onSendMessage: (content: string) => void;
}

export function ChatView({ messages, isTyping, onSendMessage }: ChatViewProps) {
  const [inputValue, setInputValue] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue("");
  };

  return (
    <>
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold tracking-wide uppercase mb-2">
              Daily Check-in
            </div>
            <p className="text-slate-400 text-xs">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isTyping && (
            <div className="flex gap-2 mb-6 ml-4">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message to your health assistant..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-6 pr-14 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
          />
          <div className="absolute right-2 top-2 flex items-center gap-1">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
              <Paperclip size={20} />
            </button>
            <button
              onClick={handleSend}
              className={`p-2 rounded-xl transition-all ${
                inputValue.trim()
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "bg-slate-200 text-slate-400"
              }`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
        <div className="text-center mt-3 text-[11px] text-slate-400">
          Health AI can make mistakes. Please verify important medical info
          with your doctor.
        </div>
      </div>
    </>
  );
}
