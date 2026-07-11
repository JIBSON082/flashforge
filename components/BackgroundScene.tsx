export default function BackgroundScene() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-bg">
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[560px] w-[860px] bg-glow-violet blur-3xl" />
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 h-[420px] w-[720px] bg-glow-accent blur-3xl" />
      <div
        className="absolute top-24 -left-24 h-64 w-64 rounded-full border border-line/40 opacity-30 animate-float"
        style={{ animationDelay: "-2s" }}
      />
      <div
        className="absolute bottom-20 -right-16 h-40 w-40 rounded-full border border-line/40 opacity-30 animate-float"
        style={{ animationDelay: "-4s" }}
      />
    </div>
  );
}

