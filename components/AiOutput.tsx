"use client";

import { useState } from "react";
import MarkdownContent from "./MarkdownContent";

type Props = { content: string };

export default function AiOutput({ content }: Props) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-apple bg-white shadow-apple">
      <div className="flex items-center justify-between border-b border-[#f2f2f7] px-6 py-3.5">
        <span className="text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">Výstup AI</span>
        <button
          onClick={copy}
          className="rounded-full border border-[#d2d2d7] px-3.5 py-1.5 text-[12px] font-medium text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
        >
          {copied ? "✓ Zkopírováno" : "Kopírovat"}
        </button>
      </div>
      <div className="p-6">
        <MarkdownContent content={content} />
      </div>
    </div>
  );
}
