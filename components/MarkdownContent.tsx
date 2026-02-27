"use client";

/**
 * Lehký markdown renderer – renderuje ## / ### nadpisy, **bold**, *italic*,
 * odrážky (- nebo •) a horizontální oddělovač (---).
 * Bez obálky, bez kopírovacího tlačítka – jen čistý obsah.
 */

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

type Props = { content: string; className?: string };

export default function MarkdownContent({ content, className }: Props) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let key = 0;

  function flushBullets() {
    if (bulletBuffer.length === 0) return;
    elements.push(
      <ul key={key++} className="my-2 space-y-1 pl-5">
        {bulletBuffer.map((item, i) => (
          <li key={i} className="list-disc text-[14px] text-[#3a3a3a]">
            {parseInline(item)}
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line === "---" || line === "---\r") {
      flushBullets();
      elements.push(<hr key={key++} className="my-4 border-[#f2f2f7]" />);
      continue;
    }

    if (line.startsWith("### ")) {
      flushBullets();
      const inner = line.replace(/^###\s*/, "").replace(/🟨\s*/g, "");
      const boldMatch = inner.match(/^\*\*(.+?)\*\*:?\s*(.*)/);
      if (boldMatch) {
        elements.push(
          <div key={key++} className="mt-5 first:mt-0">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-400">🟨</span>
              <div>
                <span className="text-[14px] font-semibold text-[#1d1d1f]">{boldMatch[1]}</span>
                {boldMatch[2] ? (
                  <span className="ml-1 text-[13px] font-normal text-[#6e6e73]">{boldMatch[2]}</span>
                ) : null}
              </div>
            </div>
          </div>
        );
      } else {
        elements.push(
          <h3 key={key++} className="mt-5 flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f] first:mt-0">
            <span className="text-amber-400">🟨</span>
            {parseInline(inner)}
          </h3>
        );
      }
      continue;
    }

    if (line.startsWith("## ")) {
      flushBullets();
      elements.push(
        <h2 key={key++} className="mt-5 text-[15px] font-semibold text-[#1d1d1f] first:mt-0">
          {parseInline(line.replace(/^##\s*/, ""))}
        </h2>
      );
      continue;
    }

    if (/^[-•]\s/.test(line)) {
      bulletBuffer.push(line.replace(/^[-•]\s/, ""));
      continue;
    }

    if (line.trim() === "") {
      flushBullets();
      continue;
    }

    flushBullets();
    const isItalic = /^\*[^*]/.test(line.trim()) && line.trim().endsWith("*");
    elements.push(
      <p
        key={key++}
        className={`text-[14px] leading-relaxed ${isItalic ? "italic text-[#86868b]" : "text-[#3a3a3a]"}`}
      >
        {parseInline(line)}
      </p>
    );
  }
  flushBullets();

  return <div className={`space-y-1 ${className ?? ""}`}>{elements}</div>;
}
