import { useEffect, useState } from "react";

export function MainMenu({ onStart }: { onStart: () => void }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const loop = () => {
      setT((performance.now() - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* animated ocean backdrop using SVG layers */}
      <div className="absolute inset-0" style={{
        background:
          "linear-gradient(to bottom, oklch(0.18 0.08 245) 0%, oklch(0.32 0.12 240) 45%, oklch(0.45 0.15 30) 70%, oklch(0.25 0.1 250) 100%)",
      }} />
      {/* sun */}
      <div
        className="absolute rounded-full"
        style={{
          width: 220,
          height: 220,
          left: "50%",
          top: "55%",
          transform: `translate(-50%, -50%) translateY(${Math.sin(t * 0.3) * 6}px)`,
          background: "radial-gradient(circle, oklch(0.95 0.15 70) 0%, oklch(0.78 0.2 50) 40%, transparent 70%)",
          filter: "blur(2px)",
        }}
      />
      {/* wave silhouette layers */}
      {[0, 1, 2, 3].map((i) => (
        <svg
          key={i}
          className="absolute bottom-0 left-0 w-full"
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
          style={{
            height: `${30 + i * 12}%`,
            opacity: 0.25 + i * 0.18,
            transform: `translateX(${Math.sin(t * (0.3 + i * 0.15)) * 30}px)`,
          }}
        >
          <path
            d={`M0 ${80 + i * 10} Q 360 ${40 - i * 6 + Math.sin(t + i) * 15} 720 ${80 + i * 10} T 1440 ${80 + i * 10} V 200 H 0 Z`}
            fill={["oklch(0.25 0.06 240)", "oklch(0.18 0.05 240)", "oklch(0.12 0.04 240)", "oklch(0.08 0.03 240)"][i]}
          />
        </svg>
      ))}
      {/* raft silhouette */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: "32%",
          transform: `translate(-50%, 0) translateY(${Math.sin(t * 0.8) * 4}px) rotate(${Math.sin(t * 0.7) * 1.5}deg)`,
        }}
      >
        <svg width="180" height="60" viewBox="0 0 180 60">
          <rect x="10" y="30" width="160" height="14" fill="oklch(0.2 0.04 40)" />
          <rect x="80" y="0" width="3" height="32" fill="oklch(0.2 0.04 40)" />
          <path d="M 83 4 L 110 16 L 83 22 Z" fill="oklch(0.5 0.18 50)" />
        </svg>
      </div>

      {/* content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-between py-16">
        <div className="text-center">
          <div className="font-mono text-xs uppercase tracking-[0.5em] text-primary/80">
            Um protótipo de sobrevivência oceânica
          </div>
          <h1 className="mt-4 font-display text-7xl font-bold tracking-tight md:text-8xl">
            <span className="text-foreground">À</span>{" "}
            <span className="bg-gradient-to-b from-primary to-accent bg-clip-text text-transparent">
              DERIVA
            </span>
          </h1>
          <p className="mt-3 max-w-md font-mono text-xs uppercase tracking-widest text-foreground/60">
            O nível do mar engoliu o mundo · Você acordou numa jangada
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={onStart}
            className="group relative rounded-sm border-2 border-primary bg-primary/10 px-16 py-4 font-mono text-sm font-bold uppercase tracking-[0.4em] text-primary backdrop-blur transition hover:bg-primary hover:text-primary-foreground"
          >
            <span className="relative z-10">Sobreviver</span>
          </button>
          <div className="grid max-w-2xl grid-cols-3 gap-6 text-center font-mono text-[10px] uppercase tracking-widest text-foreground/50">
            <div>
              <div className="text-primary">Mouse + WASD</div>
              <div>movimento em 1ª pessoa</div>
            </div>
            <div>
              <div className="text-primary">Clique</div>
              <div>lançar gancho</div>
            </div>
            <div>
              <div className="text-primary">B / C</div>
              <div>construir / bancada</div>
            </div>
          </div>
        </div>

        <div className="font-mono text-[10px] uppercase tracking-widest text-foreground/30">
          Protótipo · Three.js · Vertical Slice
        </div>
      </div>
    </div>
  );
}
