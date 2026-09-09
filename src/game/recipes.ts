import type { GameState, Resources } from "./state";

export type ItemId =
  | "purified_water"
  | "grilled_food"
  | "rope"
  | "hook_reinforced"
  | "net_trap"
  | "spear"
  | "sail"
  | "rain_collector"
  | "bandage"
  | "lantern";

export type Recipe = {
  id: ItemId;
  name: string;
  category: "Sobrevivência" | "Ferramentas" | "Estrutura";
  description: string;
  cost: Partial<Resources>;
  requires?: ItemId;
  /** consumable recipes apply an immediate effect and are not stored */
  consumable?: boolean;
  /** unique items can only be crafted once */
  unique?: boolean;
};

export const RECIPES: Recipe[] = [
  {
    id: "purified_water",
    name: "Água purificada",
    category: "Sobrevivência",
    description: "+3 de água potável no inventário.",
    cost: { plastic: 2, scrap: 1 },
    consumable: true,
  },
  {
    id: "grilled_food",
    name: "Comida grelhada",
    category: "Sobrevivência",
    description: "Restaura 30 de fome imediatamente.",
    cost: { wood: 2, scrap: 1, food: 1 },
    consumable: true,
  },
  {
    id: "bandage",
    name: "Bandagem",
    category: "Sobrevivência",
    description: "Restaura 25 de saúde imediatamente.",
    cost: { plastic: 1, wood: 1 },
    consumable: true,
  },
  {
    id: "rope",
    name: "Corda trançada",
    category: "Ferramentas",
    description: "Material base para ferramentas maiores.",
    cost: { plastic: 3 },
  },
  {
    id: "hook_reinforced",
    name: "Gancho reforçado",
    category: "Ferramentas",
    description: "Alcance maior ao lançar o gancho.",
    cost: { scrap: 3, wood: 1 },
    requires: "rope",
    unique: true,
  },
  {
    id: "spear",
    name: "Arpão",
    category: "Ferramentas",
    description: "Afasta o tubarão quando ele se aproxima.",
    cost: { wood: 3, scrap: 2 },
    unique: true,
  },
  {
    id: "net_trap",
    name: "Rede de coleta",
    category: "Estrutura",
    description: "Recolhe destroços sozinha com o tempo.",
    cost: { plastic: 4, scrap: 1 },
    requires: "rope",
    unique: true,
  },
  {
    id: "rain_collector",
    name: "Coletor de chuva",
    category: "Estrutura",
    description: "Acumula água limpa lentamente.",
    cost: { plastic: 3, wood: 2, scrap: 1 },
    unique: true,
  },
  {
    id: "sail",
    name: "Vela",
    category: "Estrutura",
    description: "Aumenta a deriva da jangada por águas novas.",
    cost: { wood: 4, plastic: 2 },
    requires: "rope",
    unique: true,
  },
  {
    id: "lantern",
    name: "Lampião",
    category: "Estrutura",
    description: "Ilumina a jangada durante a noite.",
    cost: { scrap: 3, plastic: 2 },
    unique: true,
  },
];

export function canCraft(state: GameState, r: Recipe): { ok: boolean; reason?: string } {
  if (r.unique && (state.items[r.id] ?? 0) > 0) return { ok: false, reason: "Já construído" };
  if (r.requires && (state.items[r.requires] ?? 0) < 1) {
    const need = RECIPES.find((x) => x.id === r.requires);
    return { ok: false, reason: `Requer ${need?.name ?? r.requires}` };
  }
  for (const [k, v] of Object.entries(r.cost)) {
    if (state.resources[k as keyof Resources] < (v as number)) return { ok: false, reason: "Recursos insuficientes" };
  }
  return { ok: true };
}

export const RESOURCE_LABELS: Record<keyof Resources, string> = {
  wood: "Madeira",
  plastic: "Plástico",
  scrap: "Sucata",
  food: "Comida",
  water: "Água",
};

export function costLabel(cost: Partial<Resources>): string {
  return Object.entries(cost)
    .map(([k, v]) => `${v} ${RESOURCE_LABELS[k as keyof Resources]}`)
    .join(" · ");
}
