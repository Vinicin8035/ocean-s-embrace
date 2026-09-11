import type { GameState } from "@/game/state";
import { RECIPES, canCraft, costLabel, type ItemId } from "@/game/recipes";
import { Anchor, Droplets, Flame, Hammer, Heart, Utensils, Zap } from "lucide-react";

type Props = {
  state: GameState;
  buildMode: boolean;
  showCraft: boolean;
  toast: string | null;
  pointerLocked: boolean;
  onCraft: (r: ItemId) => void;
  onConsume: (w: "food" | "water") => void;
  onToggleBuild: () => void;
  onCloseCraft: () => void;
  onRestart: () => void;
};

const PALETTE = {
  yale: "#033f63",
  teal: "#28666e",
  mutedTeal: "#7c9885",
  sage: "#b5b682",
  peach: "#fedc97",
};

function StatBar({
  icon,
  value,
  max,
  fill,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  max: number;
  fill: string;
  label: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const critical = pct < 20;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-0.5 font-mono text-[10px] font-bold uppercase tracking-tighter text-primary">
        <span className="flex items-center gap-1.5 opacity-90">
          <span className="text-accent">{icon}</span>
          {label}
        </span>
        <span className="text-sage">{Math.round(pct)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full border border-hud-stroke bg-hud-bg">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${critical ? "animate-pulse" : ""}`}
          style={{ width: `${pct}%`, background: fill, boxShadow: `0 0 8px ${fill}66` }}
        />
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

  const inventory = [
    { k: "Madeira", v: state.resources.wood, c: PALETTE.sage, shape: "rounded-sm" },
    { k: "Plástico", v: state.resources.plastic, c: PALETTE.mutedTeal, shape: "rounded-full" },
    { k: "Sucata", v: state.resources.scrap, c: PALETTE.teal, shape: "rotate-45 rounded-[2px]" },
    { k: "Comida", v: state.resources.food, c: PALETTE.peach, shape: "rounded-full" },
    { k: "Água", v: state.resources.water, c: PALETTE.mutedTeal, shape: "rounded-tl-full rounded-br-full" },
  ];

  return (
    <>
      {/* crosshair */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="h-1 w-1 rounded-full"
          style={{ backgroundColor: PALETTE.peach, boxShadow: `0 0 10px ${PALETTE.peach}` }}
        />
      </div>

      {/* top bar: day / title / clock */}
      <div className="pointer-events-none absolute left-0 top-0 flex w-full justify-center pt-4">
        <div className="flex items-center gap-6 rounded-full border border-hud-stroke bg-hud-bg px-8 py-2 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col items-center border-r border-accent/30 pr-6">
            <span className="font-mono text-[10px] uppercase tracking-widest text-sage">Cronômetro</span>
            <span className="text-lg font-semibold leading-none text-primary">
              DIA {state.day.toString().padStart(2, "0")}
            </span>
          </div>
          <h1 className="text-xl font-light uppercase tracking-[0.3em] text-primary">À Deriva</h1>
          <div className="flex flex-col items-center border-l border-accent/30 pl-6">
            <span className="font-mono text-[10px] uppercase tracking-widest text-sage">Horário</span>
            <span className="font-mono text-lg font-semibold leading-none text-primary">
              {hour.toString().padStart(2, "0")}:{min.toString().padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      {/* toast */}
      {toast && (
        <div className="pointer-events-none absolute right-8 top-24 flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded border-l-4 border-sage bg-hud-bg px-4 py-3 shadow-lg backdrop-blur-md">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm font-medium text-primary">{toast}</span>
          </div>
        </div>
      )}

      {/* status bars bottom-left */}
      <div className="absolute bottom-8 left-8 flex w-64 flex-col gap-4">
        <StatBar
          icon={<Heart className="h-3 w-3" />}
          value={state.health.value}
          max={state.health.max}
          fill={`linear-gradient(90deg, ${PALETTE.teal}, ${PALETTE.mutedTeal})`}
          label="Saúde"
        />
        <StatBar
          icon={<Utensils className="h-3 w-3" />}
          value={state.hunger.value}
          max={state.hunger.max}
          fill={PALETTE.sage}
          label="Fome"
        />
        <StatBar
          icon={<Droplets className="h-3 w-3" />}
          value={state.thirst.value}
          max={state.thirst.max}
          fill={PALETTE.peach}
          label="Sede"
        />
        <StatBar
          icon={<Zap className="h-3 w-3" />}
          value={state.energy.value}
          max={state.energy.max}
          fill={PALETTE.mutedTeal}
          label="Energia"
        />
      </div>

      {/* inventory bottom-center */}
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-3 rounded-xl border border-hud-stroke bg-hud-bg p-3 backdrop-blur-xl">
        {inventory.map((it) => (
          <div key={it.k} className="group relative flex flex-col items-center">
            <div
              className="relative flex h-14 w-14 items-center justify-center rounded-lg border-2 bg-background/60 transition-all"
              style={{ borderColor: it.v > 0 ? it.c : `${PALETTE.teal}` }}
            >
              <div
                className={`h-6 w-6 ${it.shape}`}
                style={{ backgroundColor: it.c, opacity: it.v > 0 ? 0.7 : 0.25 }}
              />
              <span className="absolute right-1 top-1 rounded bg-background px-1 font-mono text-[9px] font-bold text-primary">
                {it.v.toString().padStart(2, "0")}
              </span>
            </div>
            <span className="mt-2 font-mono text-[10px] font-semibold uppercase text-sage opacity-60 transition-opacity group-hover:opacity-100">
              {it.k}
            </span>
          </div>
        ))}
      </div>

      {/* actions bottom-right */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-3 font-mono">
        <ActionButton
          hint="Consumir ração"
          keyLabel="1"
          label="Comer"
          tone={PALETTE.mutedTeal}
          icon={<Utensils className="h-3.5 w-3.5" />}
          disabled={state.resources.food <= 0}
          onClick={() => onConsume("food")}
        />
        <ActionButton
          hint="Beber água limpa"
          keyLabel="2"
          label="Beber"
          tone={PALETTE.teal}
          icon={<Droplets className="h-3.5 w-3.5" />}
          disabled={state.resources.water <= 0}
          onClick={() => onConsume("water")}
        />
        <ActionButton
          hint="Modo construção"
          keyLabel="B"
          label="Construir"
          tone={PALETTE.sage}
          icon={<Hammer className="h-3.5 w-3.5" />}
          active={buildMode}
          onClick={onToggleBuild}
        />
      </div>

      {/* contextual prompt */}
      {!pointerLocked && !state.dead && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded border-2 border-primary bg-background/40 font-mono font-bold text-primary backdrop-blur">
              ▸
            </div>
            <p className="text-lg uppercase tracking-wide text-primary drop-shadow-md">Clique para jogar</p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-sage">
              Mouse olhar · WASD mover · Clique gancho
              <br />
              <span className="text-primary">B</span> construir ·{" "}
              <span className="text-primary">E</span> colocar piso ·{" "}
              <span className="text-primary">C</span> bancada ·{" "}
              <span className="text-primary">ESC</span> sair
            </p>
          </div>
        </div>
      )}

      {/* build help */}
      {buildMode && pointerLocked && (
        <div className="pointer-events-none absolute bottom-40 left-1/2 -translate-x-1/2 rounded border border-hud-stroke bg-hud-bg px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-primary backdrop-blur-md">
          Mire numa borda · <span className="text-sage">E</span> ou clique para colocar piso · Custo: 2 Madeira
        </div>
      )}

      {/* crafting panel */}
      {showCraft && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="w-[460px] rounded-xl border border-hud-stroke bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold uppercase tracking-[0.2em] text-primary">Bancada</h2>
              <button
                onClick={onCloseCraft}
                className="font-mono text-xs uppercase tracking-widest text-sage transition hover:text-primary"
              >
                Fechar [C]
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <CraftRow
                icon={<Droplets className="h-4 w-4" />}
                title="Purificar água"
                cost="2 Plástico + 1 Sucata"
                yields="+3 Água"
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
                yields="+1 Piso"
                onClick={() => onCraft("expand")}
              />
            </div>
          </div>
        </div>
      )}

      {/* death */}
      {state.dead && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 backdrop-blur-md">
          <div className="text-center">
            <h2 className="text-6xl font-semibold uppercase tracking-[0.15em] text-primary">O Oceano Venceu</h2>
            <p className="mt-3 font-mono text-sm uppercase tracking-widest text-sage">
              Você sobreviveu {state.day} {state.day === 1 ? "dia" : "dias"} à deriva
            </p>
            <button
              onClick={onRestart}
              className="mt-8 rounded-full border-2 border-primary bg-primary/10 px-10 py-3 font-mono text-xs uppercase tracking-[0.3em] text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ActionButton({
  hint, keyLabel, label, tone, icon, onClick, disabled, active,
}: {
  hint: string;
  keyLabel: string;
  label: string;
  tone: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group pointer-events-auto flex items-center justify-end gap-3 text-right disabled:opacity-30"
    >
      <span className="font-mono text-[10px] uppercase tracking-widest text-primary opacity-0 transition-opacity group-hover:opacity-100">
        {hint}
      </span>
      <span
        className="flex items-center gap-2 rounded border px-3 py-2 transition-colors"
        style={{
          borderColor: `${tone}66`,
          backgroundColor: active ? `${tone}66` : `${tone}22`,
        }}
      >
        <span className="text-primary">{icon}</span>
        <span className="font-mono text-xs font-bold text-primary">[{keyLabel}]</span>
        <span className="font-mono text-xs uppercase text-sage">{label}</span>
      </span>
    </button>
  );
}

function CraftRow({
  icon, title, cost, yields, onClick,
}: { icon: React.ReactNode; title: string; cost: string; yields: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border border-hud-stroke bg-muted/25 p-3 text-left transition hover:border-primary hover:bg-muted/50"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-primary">{title}</div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-sage">{cost}</div>
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-accent">{yields}</div>
    </button>
  );
}
