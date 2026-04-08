"use client";

import { Stethoscope, User2, ShieldCheck } from "lucide-react";
import type { ChatMessage } from "@/lib/hooks/useChat";

interface MessageBubbleProps {
  message: ChatMessage;
  showSourceChip?: boolean;
}

/**
 * MessageBubble — renders chat messages with markdown support.
 *
 * AI answers are rendered as structured cards with:
 *  - Avatar + "MedOS" header + optional source chip
 *  - Full markdown: bold, italic, lists, links, code, headers
 *  - Section parsing for structured medical output
 *
 * User bubbles keep the right-aligned chat style.
 */
export function MessageBubble({ message, showSourceChip }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-6 animate-fade-up">
        <div className="max-w-[85%] flex items-start gap-2">
          <div className="order-2 flex-shrink-0 w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-ink-muted">
            <User2 size={16} />
          </div>
          <div className="order-1">
            <div className="rounded-2xl rounded-tr-sm px-4 py-3 bg-brand-gradient text-white shadow-soft leading-relaxed text-[15px]">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            <div className="mt-1 text-[11px] text-ink-subtle text-right">
              {message.timestamp}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6 animate-fade-up">
      <div className="max-w-[88%] flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-white shadow-soft">
          <Stethoscope size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-ink-base tracking-tight">
              MedOS
            </span>
            {showSourceChip && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-accent-600 dark:text-accent-400 bg-accent-500/10 border border-accent-500/20 px-2 py-0.5 rounded-full">
                <ShieldCheck size={10} />
                WHO · CDC · NHS
              </span>
            )}
          </div>
          <div className="rounded-2xl rounded-tl-sm border border-line/60 bg-surface-1 shadow-soft px-4 py-3.5 text-[15px] leading-relaxed text-ink-base">
            <MarkdownContent content={message.content} />
          </div>
          <div className="mt-1 text-[11px] text-ink-subtle">
            {message.timestamp}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MarkdownContent — lightweight markdown renderer for medical AI output.
 *
 * Supports: headers (#), bold (**), italic (*), bullet lists (- / *),
 * numbered lists (1.), inline code (`), code blocks (```), links [text](url),
 * and horizontal rules (---).
 *
 * No external dependencies — pure React + regex.
 */
function MarkdownContent({ content }: { content: string }) {
  if (!content) return null;

  const blocks = parseBlocks(content);

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} />
      ))}
    </div>
  );
}

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; language: string; code: string }
  | { type: "hr" };

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trimStart().startsWith("```")) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "code", language: lang, code: codeLines.join("\n") });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})\s*$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2] });
      i++;
      continue;
    }

    // Bold heading pattern: **Heading**
    const boldHeadingMatch = line.match(/^\*\*([^*]+)\*\*\s*:?\s*$/);
    if (boldHeadingMatch) {
      blocks.push({ type: "heading", level: 3, text: boldHeadingMatch[1] });
      i++;
      continue;
    }

    // List (unordered: - or *, ordered: 1.)
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, "").replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-empty lines
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].trimStart().startsWith("```") && !lines[i].match(/^#{1,4}\s/) && !lines[i].match(/^\*\*[^*]+\*\*\s*:?\s*$/) && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i]) && !/^(-{3,}|_{3,}|\*{3,})\s*$/.test(lines[i].trim())) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", text: paraLines.join("\n") });
    }
  }

  return blocks;
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return (
        <div className="answer-section">
          <h4 className={`font-bold text-brand-600 dark:text-brand-400 mb-1 ${
            block.level <= 2 ? "text-[15px]" : "text-[13px] uppercase tracking-wider"
          }`}>
            {renderInline(block.text)}
          </h4>
        </div>
      );

    case "paragraph":
      return (
        <p className="whitespace-pre-wrap text-ink-base/95 leading-relaxed">
          {renderInline(block.text)}
        </p>
      );

    case "list":
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag className={`space-y-1 pl-1 ${block.ordered ? "list-decimal list-inside" : ""}`}>
          {block.items.map((item, i) => (
            <li key={i} className="text-ink-base/95 leading-relaxed flex items-start gap-2">
              {!block.ordered && <span className="text-brand-500 mt-1.5 text-xs flex-shrink-0">•</span>}
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ListTag>
      );

    case "code":
      return (
        <pre className="bg-surface-2 border border-line/40 rounded-xl p-3 overflow-x-auto text-[13px] font-mono text-ink-base/90 leading-relaxed">
          <code>{block.code}</code>
        </pre>
      );

    case "hr":
      return <hr className="border-line/40 my-2" />;

    default:
      return null;
  }
}

/**
 * Render inline markdown: **bold**, *italic*, `code`, [link](url)
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // Split on inline patterns and render
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic: *text* (but not **)
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/);
    // Inline code: `code`
    const codeMatch = remaining.match(/`([^`]+?)`/);
    // Link: [text](url)
    const linkMatch = remaining.match(/\[([^\]]+?)\]\(([^)]+?)\)/);

    // Find the earliest match
    const matches = [
      boldMatch ? { match: boldMatch, type: "bold" as const } : null,
      italicMatch ? { match: italicMatch, type: "italic" as const } : null,
      codeMatch ? { match: codeMatch, type: "code" as const } : null,
      linkMatch ? { match: linkMatch, type: "link" as const } : null,
    ].filter(Boolean).sort((a, b) => a!.match.index! - b!.match.index!);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    const idx = first.match.index!;

    // Text before match
    if (idx > 0) {
      parts.push(remaining.slice(0, idx));
    }

    // Render the matched element
    switch (first.type) {
      case "bold":
        parts.push(<strong key={key++} className="font-bold">{first.match[1]}</strong>);
        remaining = remaining.slice(idx + first.match[0].length);
        break;
      case "italic":
        parts.push(<em key={key++} className="italic">{first.match[1]}</em>);
        remaining = remaining.slice(idx + first.match[0].length);
        break;
      case "code":
        parts.push(
          <code key={key++} className="bg-surface-2 border border-line/40 rounded px-1.5 py-0.5 text-[13px] font-mono text-ink-base/90">
            {first.match[1]}
          </code>
        );
        remaining = remaining.slice(idx + first.match[0].length);
        break;
      case "link":
        parts.push(
          <a key={key++} href={first.match[2]} target="_blank" rel="noopener noreferrer"
            className="text-brand-500 hover:text-brand-600 underline underline-offset-2">
            {first.match[1]}
          </a>
        );
        remaining = remaining.slice(idx + first.match[0].length);
        break;
    }
  }

  return <>{parts}</>;
}
