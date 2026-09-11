/** WorldGenerator + IslandGenerator — ilhas procedurais determinísticas por seed. */
import { hash2, makeRng, type Rng } from "./rng";

export const CELL = 340; // metros por célula do mundo

export type IslandType = "pequena" | "média" | "grande";

export type NodeKind = "wood" | "stone" | "fiber" | "food" | "scrap" | "rare";

export type ResourceNode = {
  id: string;
  kind: NodeKind;
  x: number;
  z: number;
  scale: number;
};

export type PoiKind =
  | "cabana"
  | "acampamento"
  | "naufrágio"
  | "torre"
  | "suprimentos"
  | "caverna";

export type Poi = {
  id: string;
  kind: PoiKind;
  x: number;
  z: number;
  rot: number;
  loot: { kind: NodeKind; amount: number }[];
};

export type Lobe = { a: number; w: number; p: number };

export type Island = {
  id: string;
  seed: number;
  name: string;
  type: IslandType;
  x: number;
  z: number;
  radius: number;
  height: number;
  lobes: Lobe[];
  nodes: ResourceNode[];
  pois: Poi[];
  decor: { x: number; z: number; s: number; kind: "tree" | "rock" | "bush" }[];
};

const PREFIX = [
  "Ilha", "Recife", "Atol", "Cabo", "Banco", "Ponta",
];
const NAMES = [
  "Vespa", "Sereia", "Cinza", "Âmbar", "Coral", "Náufrago", "Ossos", "Sal",
  "Bruma", "Aurora", "Espinho", "Maré", "Trovão", "Vento", "Pérola", "Lodo",
  "Serena", "Vigia", "Fenda", "Casco",
];

function islandName(rng: Rng): string {
  return `${rng.pick(PREFIX)} ${rng.pick(NAMES)}`;
}

/** Raio da costa numa dada direção — dá formatos irregulares. */
export function shoreRadius(is: Island, theta: number): number {
  let r = 1;
  for (const l of is.lobes) r += l.w * Math.cos(l.a * theta + l.p);
  return is.radius * Math.max(0.35, r);
}

/** Altura do terreno em coordenadas de mundo. Abaixo de 0 = submerso. */
export function islandHeight(is: Island, x: number, z: number): number {
  const dx = x - is.x;
  const dz = z - is.z;
  const d = Math.hypot(dx, dz);
  const R = shoreRadius(is, Math.atan2(dz, dx));
  if (d > R) return -2;
  const t = 1 - d / R;
  const ridge =
    0.82 +
    0.18 * Math.sin(x * 0.09 + is.seed * 0.001) * Math.cos(z * 0.11 - is.seed * 0.002);
  return is.height * Math.pow(t, 1.5) * ridge - 0.9;
}

export function isLand(is: Island, x: number, z: number): boolean {
  return islandHeight(is, x, z) > 0.05;
}

/** Uma célula do mundo contém, no máximo, uma ilha. Determinístico. */
export function islandInCell(cx: number, cz: number, worldSeed: number): Island | null {
  if (cx === 0 && cz === 0) return null; // spawn limpo
  const h = hash2(cx, cz, worldSeed);
  const rng = makeRng(h);
  if (!rng.chance(0.62)) return null;

  const roll = rng.next();
  const type: IslandType = roll < 0.5 ? "pequena" : roll < 0.85 ? "média" : "grande";
  const radius = type === "pequena" ? rng.range(16, 26) : type === "média" ? rng.range(30, 46) : rng.range(52, 74);
  const height = type === "pequena" ? rng.range(2.5, 4.5) : type === "média" ? rng.range(5, 9) : rng.range(10, 17);

  const x = cx * CELL + rng.range(-CELL * 0.32, CELL * 0.32);
  const z = cz * CELL + rng.range(-CELL * 0.32, CELL * 0.32);

  const lobes: Lobe[] = [];
  const lobeCount = rng.int(2, 4);
  for (let i = 0; i < lobeCount; i++) {
    lobes.push({ a: rng.int(2, 5), w: rng.range(0.06, 0.2), p: rng.range(0, Math.PI * 2) });
  }

  const island: Island = {
    id: `${cx}_${cz}`,
    seed: h,
    name: islandName(rng),
    type,
    x,
    z,
    radius,
    height,
    lobes,
    nodes: [],
    pois: [],
    decor: [],
  };

  // ---- recursos: quantidade e raridade dependem do tipo e da distância do spawn
  const distFromSpawn = Math.hypot(cx, cz);
  const nodeCount = type === "pequena" ? rng.int(4, 8) : type === "média" ? rng.int(10, 18) : rng.int(20, 32);
  const rareChance = Math.min(0.16, 0.01 + distFromSpawn * 0.02) * (type === "grande" ? 1.8 : 1);

  let placed = 0;
  let guard = 0;
  while (placed < nodeCount && guard++ < nodeCount * 30) {
    const th = rng.range(0, Math.PI * 2);
    const rr = Math.sqrt(rng.next()) * shoreRadius(island, th) * 0.86;
    const px = island.x + Math.cos(th) * rr;
    const pz = island.z + Math.sin(th) * rr;
    if (islandHeight(island, px, pz) < 0.4) continue;
    const r = rng.next();
    let kind: NodeKind;
    if (r < rareChance) kind = "rare";
    else if (r < 0.42) kind = "wood";
    else if (r < 0.66) kind = "stone";
    else if (r < 0.82) kind = "fiber";
    else if (r < 0.93) kind = "food";
    else kind = "scrap";
    island.nodes.push({
      id: `${island.id}:n${placed}`,
      kind,
      x: px,
      z: pz,
      scale: rng.range(0.85, 1.35),
    });
    placed++;
  }

  // ---- pontos de interesse: raros, para preservar a descoberta
  const poiChance = type === "pequena" ? 0.16 : type === "média" ? 0.4 : 0.75;
  const poiCount = rng.chance(poiChance) ? (type === "grande" ? rng.int(1, 3) : 1) : 0;
  const POI_KINDS: PoiKind[] = ["cabana", "acampamento", "naufrágio", "torre", "suprimentos", "caverna"];
  for (let i = 0; i < poiCount; i++) {
    const th = rng.range(0, Math.PI * 2);
    const rr = Math.sqrt(rng.next()) * shoreRadius(island, th) * 0.7;
    const px = island.x + Math.cos(th) * rr;
    const pz = island.z + Math.sin(th) * rr;
    if (islandHeight(island, px, pz) < 0.6) continue;
    const kind = rng.pick(POI_KINDS);
    const loot: Poi["loot"] = [];
    const lootRolls = rng.int(2, 3);
    for (let j = 0; j < lootRolls; j++) {
      const r = rng.next();
      const k: NodeKind =
        r < 0.2 + rareChance ? "rare" : r < 0.45 ? "scrap" : r < 0.65 ? "wood" : r < 0.85 ? "food" : "fiber";
      loot.push({ kind: k, amount: k === "rare" ? 1 : rng.int(2, 5) });
    }
    island.pois.push({ id: `${island.id}:p${i}`, kind, x: px, z: pz, rot: rng.range(0, Math.PI * 2), loot });
  }

  // ---- vegetação decorativa (instanciada, sem interação)
  const decorCount = Math.round(island.radius * (type === "grande" ? 3.2 : 2.4));
  for (let i = 0; i < decorCount; i++) {
    const th = rng.range(0, Math.PI * 2);
    const rr = Math.sqrt(rng.next()) * shoreRadius(island, th) * 0.94;
    const px = island.x + Math.cos(th) * rr;
    const pz = island.z + Math.sin(th) * rr;
    const h = islandHeight(island, px, pz);
    if (h < 0.15) continue;
    const kind = h > island.height * 0.62 ? "rock" : rng.chance(0.55) ? "tree" : "bush";
    island.decor.push({ x: px, z: pz, s: rng.range(0.7, 1.5), kind });
  }

  return island;
}

/** Ilhas dentro de um raio, geradas sob demanda a partir da seed do mundo. */
export function islandsNear(x: number, z: number, worldSeed: number, radius: number): Island[] {
  const out: Island[] = [];
  const cells = Math.ceil(radius / CELL) + 1;
  const bx = Math.round(x / CELL);
  const bz = Math.round(z / CELL);
  for (let dx = -cells; dx <= cells; dx++) {
    for (let dz = -cells; dz <= cells; dz++) {
      const is = islandInCell(bx + dx, bz + dz, worldSeed);
      if (!is) continue;
      if (Math.hypot(is.x - x, is.z - z) - is.radius <= radius) out.push(is);
    }
  }
  return out;
}

export const NODE_LABEL: Record<NodeKind, string> = {
  wood: "Madeira",
  stone: "Pedra",
  fiber: "Fibra",
  food: "Fruta",
  scrap: "Sucata",
  rare: "Cristal marinho",
};

export const POI_LABEL: Record<PoiKind, string> = {
  cabana: "Cabana abandonada",
  acampamento: "Acampamento",
  "naufrágio": "Naufrágio",
  torre: "Torre de vigia",
  suprimentos: "Caixa de suprimentos",
  caverna: "Caverna",
};
