import { describe, it, expect } from "vitest";
import { parsePmOutputIntoSections } from "./pm-output-parser";

describe("parsePmOutputIntoSections", () => {
  it("parses multiple sections with ### 🟨 format", () => {
    const output = `### 🟨 **Scope**: Jaký je rozsah projektu?
Toto je obsah sekce Scope.

### 🟨 **Rizika**: Jaká jsou rizika?
Obsah sekce rizik.`;
    const sections = parsePmOutputIntoSections(output);
    expect(sections).toHaveLength(2);
    expect(sections[0]).toEqual({
      question: "Scope: Jaký je rozsah projektu?",
      answer: "Toto je obsah sekce Scope.",
    });
    expect(sections[1]).toEqual({
      question: "Rizika: Jaká jsou rizika?",
      answer: "Obsah sekce rizik.",
    });
  });

  it("stops at --- meta block", () => {
    const output = `### 🟨 **Scope**: Otázka
Obsah scope.

---
✔ **Kontrolní seznam sekcí:**
- Scope: ✅`;
    const sections = parsePmOutputIntoSections(output);
    expect(sections).toHaveLength(1);
    expect(sections[0].answer).toBe("Obsah scope.");
  });

  it("stops at 💡 Návrhy block", () => {
    const output = `### 🟨 **Předmět**: O čem to je?
Obsah.

💡 **Návrhy na zlepšení:**
- Návrh 1`;
    const sections = parsePmOutputIntoSections(output);
    expect(sections).toHaveLength(1);
    expect(sections[0].answer).toBe("Obsah.");
  });

  it("falls back to single section when no headers match", () => {
    const output = `Pouze prostý text bez sekcí.
Bez ### hlaviček.`;
    const sections = parsePmOutputIntoSections(output);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toEqual({
      question: "PM dokumentace",
      answer: output.trim(),
    });
  });

  it("handles section without question part", () => {
    const output = `### 🟨 **Scope**
Obsah bez návodné otázky.`;
    const sections = parsePmOutputIntoSections(output);
    expect(sections).toHaveLength(1);
    expect(sections[0].question).toBe("Scope");
    expect(sections[0].answer).toBe("Obsah bez návodné otázky.");
  });

  it("handles empty input", () => {
    expect(parsePmOutputIntoSections("")).toEqual([]);
    expect(parsePmOutputIntoSections("   ")).toEqual([]);
  });
});
