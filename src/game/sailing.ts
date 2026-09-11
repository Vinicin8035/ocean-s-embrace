/** BoatController — movimentação suave da jangada pelo oceano. */

export type Boat = {
  x: number;
  z: number;
  heading: number; // radianos, 0 = -Z
  speed: number; // m/s (pode ser negativa = ré)
  turn: number; // rad/s atual
};

export type BoatInput = {
  throttle: number; // -1 (ré) .. 1 (frente)
  steer: number; // -1 (esquerda) .. 1 (direita)
};

export type BoatTuning = {
  maxSpeed: number;
  accel: number;
  drag: number;
  turnAccel: number;
  turnDrag: number;
  maxTurn: number;
};

export function boatTuning(hasSail: boolean, hasRudder: boolean): BoatTuning {
  return {
    maxSpeed: hasSail ? 5.2 : 2.6,
    accel: hasSail ? 1.5 : 0.9,
    drag: 0.55,
    turnAccel: hasRudder ? 0.55 : 0.34,
    turnDrag: 1.5,
    maxTurn: hasRudder ? 0.42 : 0.26,
  };
}

export function createBoat(x = 0, z = 0): Boat {
  return { x, z, heading: 0, speed: 0, turn: 0 };
}

/** Integração com aceleração, arrasto e inércia — nada instantâneo. */
export function updateBoat(b: Boat, input: BoatInput, tune: BoatTuning, dt: number) {
  const target = input.throttle * tune.maxSpeed * (input.throttle < 0 ? 0.35 : 1);
  const diff = target - b.speed;
  const push = Math.sign(diff) * Math.min(Math.abs(diff), tune.accel * dt);
  b.speed += push;
  // arrasto da água (frame-rate independente)
  b.speed *= Math.exp(-tune.drag * dt * (input.throttle === 0 ? 1.6 : 0.5));

  // leme só morde com fluxo de água: parado, a jangada gira devagar
  const grip = Math.min(1, Math.abs(b.speed) / 1.6) * 0.85 + 0.15;
  b.turn += input.steer * tune.turnAccel * grip * dt * 4;
  b.turn *= Math.exp(-tune.turnDrag * dt);
  b.turn = Math.max(-tune.maxTurn, Math.min(tune.maxTurn, b.turn));

  b.heading += b.turn * dt * Math.sign(b.speed || 1);

  b.x += -Math.sin(b.heading) * b.speed * dt;
  b.z += -Math.cos(b.heading) * b.speed * dt;
}

export function compassLabel(heading: number): string {
  const deg = ((-heading * 180) / Math.PI + 360) % 360;
  const dirs = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

export function headingDegrees(heading: number): number {
  return Math.round(((-heading * 180) / Math.PI + 360) % 360);
}
