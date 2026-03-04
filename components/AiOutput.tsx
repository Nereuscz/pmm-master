"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import MarkdownContent from "./MarkdownContent";

type Props = { content: string; downloadFilename?: string };

export default function AiOutput({ content, downloadFilename = "pm-vystup" }: Props) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<"docx" | "pdf" | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  function copy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleDownloadDocx() {
    setExporting("docx");
    try {
      const { convertMarkdownToDocx, downloadDocx } = await import("@mohtasham/md-to-docx");
      const blob = await convertMarkdownToDocx(content);
      downloadDocx(blob, `${downloadFilename}.docx`);
    } catch (e) {
      console.error("DOCX export failed:", e);
      toast.error("Export DOCX selhal. Zkuste to znovu.");
    } finally {
      setExporting(null);
    }
  }

  async function handleDownloadPdf() {
    if (!contentRef.current) return;
    setExporting("pdf");
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 12,
          filename: `${downloadFilename}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
        })
        .from(contentRef.current)
        .save();
    } catch (e) {
      console.error("PDF export failed:", e);
      toast.error("Export PDF selhal. Zkuste to znovu.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="rounded-apple bg-white shadow-apple">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f2f2f7] px-6 py-3.5">
        <span className="text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">Výstup AI</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadDocx}
            disabled={!!exporting}
            className="rounded-full border border-[#d2d2d7] px-3.5 py-1.5 text-[12px] font-medium text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f] disabled:opacity-50"
          >
            {exporting === "docx" ? "Generuji…" : "Stáhnout DOCX"}
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={!!exporting}
            className="rounded-full border border-[#d2d2d7] px-3.5 py-1.5 text-[12px] font-medium text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f] disabled:opacity-50"
          >
            {exporting === "pdf" ? "Generuji…" : "Stáhnout PDF"}
          </button>
          <button
            onClick={copy}
            aria-label={copied ? "Zkopírováno" : "Kopírovat do schránky"}
            className="rounded-full border border-[#d2d2d7] px-3.5 py-1.5 text-[12px] font-medium text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
          >
            {copied ? "✓ Zkopírováno" : "Kopírovat"}
          </button>
        </div>
      </div>
      <div ref={contentRef} className="p-6">
        <MarkdownContent content={content} />
      </div>
    </div>
  );
}
