export type Stat = { value: number; max: number };

export type Resources = {
  wood: number;
  plastic: number;
  scrap: number;
  food: number;
  water: number;
};

export type RaftTile = { x: number; z: number };

export type GameState = {
  hunger: Stat;
  thirst: Stat;
  energy: Stat;
  health: Stat;
  resources: Resources;
  tiles: RaftTile[];
  paused: boolean;
  dead: boolean;
  day: number;
  timeOfDay: number; // 0..1
};

export function initialState(): GameState {
  return {
    hunger: { value: 80, max: 100 },
    thirst: { value: 70, max: 100 },
    energy: { value: 90, max: 100 },
    health: { value: 100, max: 100 },
    resources: { wood: 0, plastic: 0, scrap: 0, food: 1, water: 1 },
    tiles: [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 0, z: 1 },
      { x: 1, z: 1 },
    ],
    paused: false,
    dead: false,
    day: 1,
    timeOfDay: 0.25,
  };
}

export const TILE = 2; // meters
