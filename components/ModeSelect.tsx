"use client";

import { useState } from "react";
import StepShell from "./StepShell";
import { ListChecks, MessageSquareText, BookOpenText, ArrowRight, Sparkles } from "lucide-react";
import { ExamMode } from "@/lib/types";

const MODES: {
  id: ExamMode;
  title: string;
  blurb: string;
  icon: typeof ListChecks;
  accent: string;
}[] = [
  {
    id: "MCQ",
    title: "Multiple Choice",
    blurb: "4 options per card, built for quick recall and fast review.",
    icon: ListChecks,
    accent: "text-mint",
  },
  {
    id: "SAQ",
    title: "Short Answer",
    blurb: "Focused questions with tight, exam-ready model answers.",
    icon: MessageSquareText,
    accent: "text-violet-soft",
  },
  {
    id: "THEORY",
    title: "Theory",
    blurb: "Essay-style prompts with full, structured model answers.",
    icon: BookOpenText,
    accent: "text-accent",
  },
];

export default function ModeSelect({
  name,
  fileName,
  onConfirm,
  onBack,
}: {
  name: string;
  fileName: string;
  onConfirm: (mode: ExamMode) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<ExamMode | null>(null);

  return (
    <StepShell>
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="text-center space-y-1.5">
          <p className="font-mono text-xs tracking-[0.25em] uppercase text-text-faint">Step 2 of 3</p>
          <h1 className="text-3xl md:text-4xl font-display font-semibold">
            How do you want to be tested, <span className="text-accent">{name}</span>?
          </h1>
          <p className="text-text-muted text-sm">
            Pick a mode for <span className="text-text">{fileName}</span> — you can always make another deck later.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = selected === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={`text-left rounded-3xl border px-5 py-6 flex flex-col gap-4 transition-all
                  ${active
                    ? "border-accent bg-raised shadow-glow -translate-y-1"
                    : "border-line bg-surface/70 hover:border-violet/60 hover:-translate-y-0.5"}`}
              >
                <div className={`h-11 w-11 rounded-2xl bg-bg flex items-center justify-center ${m.accent}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-display font-semibold">{m.title}</p>
                  <p className="text-text-muted text-xs mt-1.5 leading-relaxed">{m.blurb}</p>
                </div>
                {active && (
                  <span className="flex items-center gap-1 text-accent text-xs font-mono">
                    <Sparkles size={12} /> selected
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-text-muted hover:text-text text-sm font-medium px-2 py-3 transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            className="flex-1 flex items-center justify-center gap-2 rounded-full bg-accent text-ink font-display font-semibold py-3.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-glow active:scale-[0.98]"
          >
            Generate my deck <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </StepShell>
  );
}

