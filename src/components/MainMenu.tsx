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
      {/* ocean backdrop in palette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, #033f63 0%, #28666e 42%, #7c9885 62%, #033f63 100%)",
        }}
      />
      {/* sun */}
      <div
        className="absolute rounded-full"
        style={{
          width: 260,
          height: 260,
          left: "50%",
          top: "56%",
          transform: `translate(-50%, -50%) translateY(${Math.sin(t * 0.3) * 6}px)`,
          background:
            "radial-gradient(circle, #fedc97 0%, rgba(254,220,151,0.55) 38%, transparent 70%)",
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
            opacity: 0.3 + i * 0.17,
            transform: `translateX(${Math.sin(t * (0.3 + i * 0.15)) * 30}px)`,
          }}
        >
          <path
            d={`M0 ${80 + i * 10} Q 360 ${40 - i * 6 + Math.sin(t + i) * 15} 720 ${80 + i * 10} T 1440 ${80 + i * 10} V 200 H 0 Z`}
            fill={["#7c9885", "#28666e", "#0a4a63", "#033f63"][i]}
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
          <rect x="10" y="30" width="160" height="14" fill="#033f63" />
          <rect x="80" y="0" width="3" height="32" fill="#033f63" />
          <path d="M 83 4 L 110 16 L 83 22 Z" fill="#b5b682" />
        </svg>
      </div>

      {/* content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-between py-16">
        <div className="text-center">
          <div className="font-mono text-xs uppercase tracking-[0.5em] text-sage">
            Um protótipo de sobrevivência oceânica
          </div>
          <h1 className="mt-4 text-7xl font-light uppercase tracking-[0.2em] text-primary drop-shadow-[0_4px_24px_rgba(3,63,99,0.8)] md:text-8xl">
            À Deriva
          </h1>
          <p className="mt-4 max-w-md font-mono text-[11px] uppercase tracking-widest text-sage">
            O nível do mar engoliu o mundo · Você acordou numa jangada
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <button
            onClick={onStart}
            className="rounded-full border-2 border-primary bg-primary/10 px-16 py-4 font-mono text-sm font-bold uppercase tracking-[0.4em] text-primary backdrop-blur transition hover:bg-primary hover:text-primary-foreground"
          >
            Sobreviver
          </button>
          <div className="grid max-w-2xl grid-cols-3 gap-8 text-center font-mono text-[10px] uppercase tracking-widest text-sage">
            <div>
              <div className="text-primary">Mouse + WASD</div>
              <div className="opacity-70">movimento em 1ª pessoa</div>
            </div>
            <div>
              <div className="text-primary">Clique</div>
              <div className="opacity-70">lançar gancho</div>
            </div>
            <div>
              <div className="text-primary">B / C</div>
              <div className="opacity-70">construir / bancada</div>
            </div>
          </div>
        </div>

        <div className="font-mono text-[10px] uppercase tracking-widest text-sage/50">
          Protótipo · Three.js · Vertical Slice
        </div>
      </div>
    </div>
  );
}
