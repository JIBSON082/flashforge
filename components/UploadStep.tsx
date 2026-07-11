"use client";

import { useCallback, useRef, useState } from "react";
import StepShell from "./StepShell";
import { UploadCloud, FileText, X, ArrowRight, Loader2 } from "lucide-react";

const ACCEPTED = ".pdf,.pptx,.ppt,.docx,.doc,.odp,.odt";

export default function UploadStep({
  name,
  onExtracted,
  onBack,
}: {
  name: string;
  onExtracted: (text: string, fileName: string) => void;
  onBack: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "reading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((f: File | null) => {
    if (!f) return;
    setFile(f);
    setStatus("idle");
    setError(null);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f ?? null);
  };

  const submit = async () => {
    if (!file) return;
    setStatus("reading");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't read that file.");
      onExtracted(data.text, file.name);
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Something went wrong. Try again.");
    }
  };

  return (
    <StepShell>
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div className="text-center space-y-1.5">
          <p className="font-mono text-xs tracking-[0.25em] uppercase text-text-faint">Step 1 of 3</p>
          <h1 className="text-3xl md:text-4xl font-display font-semibold">
            Alright <span className="text-accent">{name}</span>, let&apos;s see those slides.
          </h1>
          <p className="text-text-muted text-sm">PDF, PowerPoint, or Word — we&apos;ll pull out every point.</p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative cursor-pointer rounded-3xl border-2 border-dashed px-8 py-14 flex flex-col items-center gap-4 text-center transition-all
            ${dragging ? "border-accent bg-accent/5 scale-[1.01]" : "border-line bg-surface/60 hover:border-violet/60 hover:bg-surface"}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <div className="h-14 w-14 rounded-2xl bg-violet/15 flex items-center justify-center text-violet">
            <UploadCloud size={26} />
          </div>
          <div>
            <p className="font-display font-medium">Drop your slides here</p>
            <p className="text-text-faint text-xs mt-1">or tap to browse your files</p>
          </div>
        </div>

        {file && (
          <div className="flex items-center gap-3 rounded-2xl bg-surface border border-line px-4 py-3">
            <div className="h-10 w-10 rounded-xl bg-mint/15 flex items-center justify-center text-mint shrink-0">
              <FileText size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-text-faint text-xs">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setStatus("idle");
              }}
              className="text-text-faint hover:text-coral transition-colors p-1"
              aria-label="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && <p className="text-coral text-sm text-center">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-text-muted hover:text-text text-sm font-medium px-2 py-3 transition-colors"
          >
            Back
          </button>
          <button
            onClick={submit}
            disabled={!file || status === "reading"}
            className="flex-1 flex items-center justify-center gap-2 rounded-full bg-accent text-ink font-display font-semibold py-3.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-glow active:scale-[0.98]"
          >
            {status === "reading" ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Reading your slides…
              </>
            ) : (
              <>
                Continue <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </StepShell>
  );
}

