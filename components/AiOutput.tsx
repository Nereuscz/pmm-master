"use client";

import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import MarkdownContent from "./MarkdownContent";

type Props = {
  content: string;
  downloadFilename?: string;
  sessionId?: string;
  /** Called after a successful inline save so the parent can sync its local state */
  onContentSaved?: (newContent: string) => void;
};

// ─── WYSIWYG toolbar button ───────────────────────────────────────────────────

function ToolbarBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`rounded px-2 py-1 text-[12px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-brand-400 ${
        active
          ? "bg-brand-100 text-brand-700"
          : "text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AiOutput({
  content,
  downloadFilename = "pm-vystup",
  sessionId,
  onContentSaved,
}: Props) {
  const [localContent, setLocalContent] = useState(content);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<"docx" | "pdf" | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // ── TipTap editor (lazy-initialised, only mounted in edit mode) ─────────────

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          // Disable extensions that don't round-trip through tiptap-markdown cleanly
          codeBlock: false,
          horizontalRule: true,
        }),
        Markdown.configure({
          html: false,
          tightLists: true,
          bulletListMarker: "-",
          transformPastedText: true,
          transformCopiedText: false,
        }),
      ],
      content: "",
      editorProps: {
        attributes: {
          class:
            "prose prose-sm max-w-none min-h-[300px] focus:outline-none px-1 py-1 leading-relaxed text-[#1d1d1f]",
        },
      },
    },
    []
  );

  // ── Enter / exit edit mode ──────────────────────────────────────────────────

  const enterEdit = useCallback(() => {
    if (!editor) return;
    editor.commands.setContent(localContent);
    setIsEditing(true);
  }, [editor, localContent]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!editor || !sessionId) return;
    const newMarkdown = editor.storage.markdown.getMarkdown() as string;
    setSaving(true);
    try {
      const r = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_output: newMarkdown }),
      });
      if (!r.ok) {
        const json = await r.json().catch(() => ({}));
        throw new Error(json.error ?? "Uložení selhalo");
      }
      setLocalContent(newMarkdown);
      onContentSaved?.(newMarkdown);
      setIsEditing(false);
      toast.success("Výstup uložen.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Uložení selhalo.");
    } finally {
      setSaving(false);
    }
  }, [editor, sessionId, onContentSaved]);

  // ── Export helpers ──────────────────────────────────────────────────────────

  function copy() {
    navigator.clipboard.writeText(localContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleDownloadDocx() {
    setExporting("docx");
    try {
      const { convertMarkdownToDocx, downloadDocx } = await import("@mohtasham/md-to-docx");
      const blob = await convertMarkdownToDocx(localContent);
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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-apple bg-white shadow-apple">
      {/* ── Top toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f2f2f7] px-6 py-3.5">
        <span className="text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">
          {isEditing ? "Úprava výstupu" : "Výstup AI"}
        </span>

        {isEditing ? (
          /* Edit-mode actions */
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-full border border-[#d2d2d7] px-3.5 py-1.5 text-[12px] font-medium text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
            >
              Zrušit
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-brand-600 px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Ukládám…" : "Uložit"}
            </button>
          </div>
        ) : (
          /* View-mode actions */
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
            {sessionId ? (
              <button
                type="button"
                onClick={enterEdit}
                className="rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-[12px] font-medium text-brand-700 transition-colors hover:bg-brand-100"
              >
                ✏️ Upravit
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* ── WYSIWYG formatting toolbar (edit mode only) ───────────────────────── */}
      {isEditing && editor ? (
        <div className="flex flex-wrap items-center gap-1 border-b border-[#f2f2f7] px-4 py-2">
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Tučné (Ctrl+B)"
          >
            <strong>B</strong>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Kurzíva (Ctrl+I)"
          >
            <em>I</em>
          </ToolbarBtn>
          <span className="mx-1 text-[#d2d2d7]">|</span>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            title="Nadpis H2"
          >
            H2
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
            title="Nadpis H3"
          >
            H3
          </ToolbarBtn>
          <span className="mx-1 text-[#d2d2d7]">|</span>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Odrážkový seznam"
          >
            ≡
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Číslovaný seznam"
          >
            1.
          </ToolbarBtn>
          <span className="mx-1 text-[#d2d2d7]">|</span>
          <ToolbarBtn
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Zpět (Ctrl+Z)"
          >
            ↩
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Znovu (Ctrl+Y)"
          >
            ↪
          </ToolbarBtn>
        </div>
      ) : null}

      {/* ── Content area ─────────────────────────────────────────────────────── */}
      <div ref={contentRef} className="p-6">
        {isEditing && editor ? (
          <EditorContent editor={editor} />
        ) : (
          <MarkdownContent content={localContent} />
        )}
      </div>
    </div>
  );
}
