"use client";

import { useState } from "react";

type Props = { content: string };

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2]) parts.push(<strong key={match.index}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={match.index}>{match[3]}</em>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function AiOutput({ content }: Props) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let key = 0;

  function flushBullets() {
    if (bulletBuffer.length === 0) return;
    elements.push(
      <ul key={key++} className="my-1 space-y-1 pl-5">
        {bulletBuffer.map((item, i) => (
          <li key={i} className="list-disc text-slate-700">
            {parseInline(item)}
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Horizontal rule
    if (line === "---" || line === "---\r") {
      flushBullets();
      elements.push(<hr key={key++} className="my-4 border-slate-200" />);
      continue;
    }

    // H3 section header: ### 🟨 **Title**: hint
    if (line.startsWith("### ")) {
      flushBullets();
      const inner = line.replace(/^###\s*/, "").replace(/🟨\s*/g, "");
      // Split on first **: **Title**: rest
      const boldMatch = inner.match(/^\*\*(.+?)\*\*:?\s*(.*)/);
      if (boldMatch) {
        elements.push(
          <div key={key++} className="mt-6 first:mt-0">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-400">🟨</span>
              <div>
                <span className="font-semibold text-slate-900">{boldMatch[1]}</span>
                {boldMatch[2] ? (
                  <span className="ml-1 font-normal text-slate-500">{boldMatch[2]}</span>
                ) : null}
              </div>
            </div>
          </div>
        );
      } else {
        elements.push(
          <h3 key={key++} className="mt-6 flex items-center gap-2 font-semibold text-slate-900 first:mt-0">
            <span className="text-amber-400">🟨</span>
            {parseInline(inner)}
          </h3>
        );
      }
      continue;
    }

    // H2
    if (line.startsWith("## ")) {
      flushBullets();
      elements.push(
        <h2 key={key++} className="mt-6 text-lg font-bold text-slate-900">
          {parseInline(line.replace(/^##\s*/, ""))}
        </h2>
      );
      continue;
    }

    // Bullet points
    if (/^[-•]\s/.test(line)) {
      bulletBuffer.push(line.replace(/^[-•]\s/, ""));
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      flushBullets();
      continue;
    }

    // Normal paragraph line (including italic PM context)
    flushBullets();
    const isItalic = /^\*[^*]/.test(line.trim()) && line.trim().endsWith("*");
    elements.push(
      <p
        key={key++}
        className={`text-sm leading-relaxed ${isItalic ? "italic text-slate-500" : "text-slate-700"}`}
      >
        {parseInline(line)}
      </p>
    );
  }
  flushBullets();

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <span className="text-sm font-medium text-slate-700">Výstup AI</span>
        <button
          onClick={copy}
          className="rounded-md px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          {copied ? "✓ Zkopírováno" : "Kopírovat"}
        </button>
      </div>
      <div className="space-y-1 p-5">{elements}</div>
    </div>
  );
}
