"use client";

import { FormEvent, useState } from "react";
import StepShell from "./StepShell";

export default function NameGate({
  onSubmit,
}: {
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setTouched(true);
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <StepShell>
      <div className="relative w-full max-w-md">
        {/* fanned card stack behind the form */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="absolute h-64 w-52 rounded-3xl bg-raised border border-line/60 opacity-0 animate-fan-in"
            style={{ "--rot": "-9deg", animationDelay: "0.05s" } as React.CSSProperties}
          />
          <div
            className="absolute h-64 w-52 rounded-3xl bg-surface border border-line/60 opacity-0 animate-fan-in"
            style={{ "--rot": "8deg", animationDelay: "0.15s" } as React.CSSProperties}
          />
        </div>

        <form
          onSubmit={handleSubmit}
          className="relative z-10 flex flex-col items-center text-center gap-7 rounded-3xl bg-surface/95 backdrop-blur border border-line/60 shadow-card px-8 py-12 opacity-0 animate-fan-in"
          style={{ "--rot": "0deg", animationDelay: "0.25s" } as React.CSSProperties}
        >
          <span className="font-mono text-xs tracking-[0.25em] uppercase text-text-faint">
            FlashForge
          </span>

          <div className="space-y-2">
            <h1 className="font-hand text-5xl text-accent leading-none">
              Hey, what&apos;s your name?
            </h1>
            <p className="text-text-muted text-sm max-w-xs mx-auto">
              We&apos;ll use it to keep things personal while we build your deck.
            </p>
          </div>

          <div className="w-full">
            <input
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (touched) setTouched(false);
              }}
              placeholder="Type your first name"
              className="w-full text-center bg-transparent border-b-2 border-line focus:border-accent outline-none text-2xl font-display py-2 placeholder:text-text-faint transition-colors"
            />
            {touched && (
              <p className="text-coral text-xs mt-2">Tell us your name so we know what to call you.</p>
            )}
          </div>

          <button
            type="submit"
            className="group relative w-full rounded-full bg-accent text-ink font-display font-semibold py-3.5 text-base overflow-hidden transition-transform active:scale-[0.98] hover:shadow-glow"
          >
            Continue
          </button>
        </form>
      </div>
    </StepShell>
  );
}

