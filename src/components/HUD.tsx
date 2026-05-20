import type { GameState } from "@/game/state";
import { Anchor, Droplets, Flame, Hammer, Heart, Utensils, Zap } from "lucide-react";

type Props = {
  state: GameState;
  buildMode: boolean;
  showCraft: boolean;
  toast: string | null;
  pointerLocked: boolean;
  onCraft: (r: "purifier" | "grill" | "expand") => void;
  onConsume: (w: "food" | "water") => void;
  onToggleBuild: () => void;
  onCloseCraft: () => void;
  onRestart: () => void;
};

function StatBar({
  icon,
  value,
  max,
  color,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-hud-stroke bg-hud-bg text-foreground">
        {icon}
      </div>
      <div className="flex w-32 flex-col gap-0.5">
        <div className="flex items-baseline justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <span>{label}</span>
          <span>{Math.round(value)}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-hud-bg">
          <div
            className="h-full transition-[width] duration-300"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

export function HUD({
  state,
  buildMode,
  showCraft,
  toast,
  pointerLocked,
  onCraft,
  onConsume,
  onToggleBuild,
  onCloseCraft,
  onRestart,
}: Props) {
  const hour = Math.floor(state.timeOfDay * 24);
  const min = Math.floor((state.timeOfDay * 24 - hour) * 60);

  return (
    <>
      {/* crosshair */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-1 w-1 rounded-full bg-foreground/60" />
      </div>

      {/* top bar */}
      <div className="pointer-events-none absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-3 rounded-sm border border-hud-stroke bg-hud-bg px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground/80 backdrop-blur">
        <span>Dia {state.day}</span>
        <span className="opacity-40">·</span>
        <span>
          {hour.toString().padStart(2, "0")}:{min.toString().padStart(2, "0")}
        </span>
        <span className="opacity-40">·</span>
        <span className="text-primary">À Deriva</span>
      </div>

      {/* stats bottom-left */}
      <div className="absolute bottom-5 left-5 flex flex-col gap-2">
        <StatBar icon={<Heart className="h-3.5 w-3.5" />} value={state.health.value} max={state.health.max} color="oklch(0.65 0.22 25)" label="Saúde" />
        <StatBar icon={<Utensils className="h-3.5 w-3.5" />} value={state.hunger.value} max={state.hunger.max} color="oklch(0.78 0.14 75)" label="Fome" />
        <StatBar icon={<Droplets className="h-3.5 w-3.5" />} value={state.thirst.value} max={state.thirst.max} color="oklch(0.72 0.16 200)" label="Sede" />
        <StatBar icon={<Zap className="h-3.5 w-3.5" />} value={state.energy.value} max={state.energy.max} color="oklch(0.85 0.16 95)" label="Energia" />
      </div>

      {/* inventory bottom-right */}
      <div className="absolute bottom-5 right-5 grid grid-cols-5 gap-1.5">
        {[
          { k: "Madeira", v: state.resources.wood, c: "oklch(0.55 0.1 60)" },
          { k: "Plástico", v: state.resources.plastic, c: "oklch(0.85 0.04 80)" },
          { k: "Sucata", v: state.resources.scrap, c: "oklch(0.55 0.02 240)" },
          { k: "Comida", v: state.resources.food, c: "oklch(0.65 0.2 30)" },
          { k: "Água", v: state.resources.water, c: "oklch(0.72 0.16 200)" },
        ].map((it) => (
          <div
            key={it.k}
            className="flex h-14 w-14 flex-col items-center justify-center rounded-sm border border-hud-stroke bg-hud-bg backdrop-blur"
          >
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: it.c }} />
            <div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">{it.k}</div>
            <div className="font-mono text-sm font-bold text-foreground">{it.v}</div>
          </div>
        ))}
      </div>

      {/* actions right side */}
      <div className="absolute right-5 top-1/2 flex -translate-y-1/2 flex-col gap-2">
        <button
          onClick={() => onConsume("food")}
          disabled={state.resources.food <= 0}
          className="pointer-events-auto flex flex-col items-center justify-center rounded-sm border border-hud-stroke bg-hud-bg px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-foreground/80 backdrop-blur transition hover:border-primary hover:text-primary disabled:opacity-30"
        >
          <Utensils className="mb-1 h-4 w-4" />
          Comer
        </button>
        <button
          onClick={() => onConsume("water")}
          disabled={state.resources.water <= 0}
          className="pointer-events-auto flex flex-col items-center justify-center rounded-sm border border-hud-stroke bg-hud-bg px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-foreground/80 backdrop-blur transition hover:border-accent hover:text-accent disabled:opacity-30"
        >
          <Droplets className="mb-1 h-4 w-4" />
          Beber
        </button>
        <button
          onClick={onToggleBuild}
          className={`pointer-events-auto flex flex-col items-center justify-center rounded-sm border px-3 py-2 font-mono text-[10px] uppercase tracking-widest backdrop-blur transition ${
            buildMode ? "border-primary bg-primary/20 text-primary" : "border-hud-stroke bg-hud-bg text-foreground/80 hover:border-primary"
          }`}
        >
          <Hammer className="mb-1 h-4 w-4" />
          Construir
        </button>
      </div>

      {/* contextual prompt */}
      {!pointerLocked && !state.dead && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-sm border border-hud-stroke bg-hud-bg px-6 py-4 text-center font-mono text-xs uppercase tracking-widest text-foreground/80 backdrop-blur">
            Clique para jogar · Mouse: olhar · WASD: mover · Clique: lançar gancho
            <br />
            <span className="text-primary">B</span> construir · <span className="text-primary">E</span> colocar piso · <span className="text-primary">C</span> crafting · <span className="text-primary">ESC</span> sair
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 rounded-sm border border-primary/40 bg-hud-bg px-4 py-2 font-mono text-xs uppercase tracking-widest text-primary backdrop-blur">
          {toast}
        </div>
      )}

      {/* build help */}
      {buildMode && pointerLocked && (
        <div className="pointer-events-none absolute left-1/2 bottom-32 -translate-x-1/2 rounded-sm border border-primary/40 bg-hud-bg px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-primary backdrop-blur">
          Mire numa borda · <span className="opacity-70">E</span> ou clique para colocar piso · Custo: 2 Madeira
        </div>
      )}

      {/* crafting panel */}
      {showCraft && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="w-[460px] rounded-sm border border-hud-stroke bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold tracking-tight">Bancada de Trabalho</h2>
              <button
                onClick={onCloseCraft}
                className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Fechar [C]
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <CraftRow
                icon={<Droplets className="h-4 w-4" />}
                title="Purificar água"
                cost="2 Plástico + 1 Sucata"
                yields="+3 Água potável"
                onClick={() => onCraft("purifier")}
              />
              <CraftRow
                icon={<Flame className="h-4 w-4" />}
                title="Grelhar comida"
                cost="2 Madeira + 1 Sucata + 1 Comida"
                yields="+30 Fome"
                onClick={() => onCraft("grill")}
              />
              <CraftRow
                icon={<Anchor className="h-4 w-4" />}
                title="Expandir jangada"
                cost="2 Madeira"
                yields="+1 Piso (mire na borda)"
                onClick={() => onCraft("expand")}
              />
            </div>
          </div>
        </div>
      )}

      {/* death */}
      {state.dead && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/85 backdrop-blur-md">
          <div className="text-center">
            <h2 className="font-display text-6xl font-bold tracking-tight text-danger">O OCEANO VENCEU</h2>
            <p className="mt-2 font-mono text-sm uppercase tracking-widest text-muted-foreground">
              Você sobreviveu {state.day} {state.day === 1 ? "dia" : "dias"} à deriva
            </p>
            <button
              onClick={onRestart}
              className="mt-8 rounded-sm border border-primary bg-primary/20 px-8 py-3 font-mono text-xs uppercase tracking-[0.3em] text-primary transition hover:bg-primary/30"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function CraftRow({
  icon, title, cost, yields, onClick,
}: { icon: React.ReactNode; title: string; cost: string; yields: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-sm border border-border bg-muted/30 p-3 text-left transition hover:border-primary hover:bg-muted/60"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/20 text-primary">{icon}</div>
      <div className="flex-1">
        <div className="font-display text-sm font-semibold">{title}</div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{cost}</div>
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-primary">{yields}</div>
    </button>
  );
}
