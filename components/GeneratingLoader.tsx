"use client";

import { useEffect, useState } from "react";
import StepShell from "./StepShell";

export default function GeneratingLoader({
  name,
  mode,
}: {
  name: string;
  mode: string;
}) {
  const messages = [
    `Reading through your slides, ${name}…`,
    "Spotting every definition and key point…",
    `Writing ${mode} questions that don't skip anything…`,
    "Double-checking nothing got left out…",
    "Almost ready…",
  ];
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setI((prev) => Math.min(prev + 1, messages.length - 1));
    }, 2200);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <StepShell>
      <div className="flex flex-col items-center gap-8">
        <div className="relative h-28 w-24">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="absolute inset-0 rounded-2xl bg-surface border border-line shadow-card"
              style={{
                animation: `float 1.8s ease-in-out ${idx * 0.2}s infinite`,
                transform: `rotate(${(idx - 1) * 10}deg) translateY(${idx * 2}px)`,
                zIndex: 3 - idx,
              }}
            >
              <div className="absolute inset-3 rounded-lg border border-line/70" />
            </div>
          ))}
        </div>

        <div className="text-center space-y-2 max-w-xs">
          <p className="font-display text-lg font-medium min-h-[3.5rem] flex items-center justify-center">
            {messages[i]}
          </p>
          <div className="w-40 h-1 mx-auto rounded-full bg-line overflow-hidden">
            <div className="h-full w-1/3 bg-accent rounded-full animate-[shimmer_1.4s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(340%); }
        }
      `}</style>
    </StepShell>
  );
}

