import type { ChatMessage } from "@/lib/hooks/useChat";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-6`}
    >
      <div className={`max-w-[85%] ${isUser ? "order-1" : "order-2"}`}>
        <div
          className={`p-4 rounded-2xl shadow-sm leading-relaxed text-[15px] ${
            isUser
              ? "bg-blue-600 text-white rounded-br-none"
              : "bg-white border border-slate-100 text-slate-700 rounded-bl-none"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <div
          className={`mt-1 text-[11px] text-slate-400 ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {message.timestamp}
        </div>
      </div>
    </div>
  );
}
