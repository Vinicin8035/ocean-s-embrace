import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { createOceanMaterial, sampleWaveHeight } from "@/game/ocean";
import { createSky } from "@/game/sky";
import { initialState, type GameState, TILE, type RaftTile } from "@/game/state";
import { HUD } from "@/components/HUD";
import { MainMenu } from "@/components/MainMenu";

type Floater = {
  mesh: THREE.Object3D;
  kind: "wood" | "plastic" | "scrap" | "food";
  phase: number;
};

type Shark = {
  mesh: THREE.Object3D;
  angle: number;
  radius: number;
  speed: number;
  aggro: number;
};

export default function Game() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<GameState>(() => initialState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const [started, setStarted] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [buildMode, setBuildMode] = useState(false);
  const buildModeRef = useRef(false);
  buildModeRef.current = buildMode;
  const [showCraft, setShowCraft] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((m: string) => {
    setToast(m);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const apiRef = useRef<{
    tryPlaceTile: () => void;
    throwHook: () => void;
  } | null>(null);

  useEffect(() => {
    if (!started || !mountRef.current) return;
    const mount = mountRef.current;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xb8c8d8, 0.006);

    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.1, 2000);
    camera.position.set(0, 2.5, 0);

    const sky = createSky();
    scene.add(sky);

    const sun = new THREE.DirectionalLight(0xfedc97, 1.6);
    sun.position.set(40, 60, 20);
    scene.add(sun);
    const ambient = new THREE.HemisphereLight(0x7c9885, 0x033f63, 0.55);
    scene.add(ambient);
    // bounce light from the water, keeps the raft readable at dusk/night
    const bounce = new THREE.DirectionalLight(0x28666e, 0.35);
    bounce.position.set(-30, -10, -20);
    scene.add(bounce);
    const rim = new THREE.DirectionalLight(0xb5b682, 0.25);
    rim.position.set(-20, 25, -35);
    scene.add(rim);


    const oceanMat = createOceanMaterial(camera.position);
    const oceanGeo = new THREE.PlaneGeometry(800, 800, 256, 256);
    oceanGeo.rotateX(-Math.PI / 2);
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    scene.add(ocean);

    const raftRoot = new THREE.Group();
    scene.add(raftRoot);

    const tileGeo = new THREE.BoxGeometry(TILE, 0.18, TILE);
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x9a6a3c,
      roughness: 0.85,
      metalness: 0.05,
    });
    const woodEdgeMat = new THREE.MeshStandardMaterial({ color: 0x6e4423, roughness: 0.9 });

    const tileMeshes = new Map<string, THREE.Object3D>();
    const tileKey = (t: RaftTile) => `${t.x},${t.z}`;

    function buildTileMesh(t: RaftTile) {
      const g = new THREE.Group();
      const top = new THREE.Mesh(tileGeo, woodMat);
      g.add(top);
      for (let i = 0; i < 4; i++) {
        const plank = new THREE.Mesh(
          new THREE.BoxGeometry(TILE * 0.95, 0.06, 0.12),
          woodEdgeMat
        );
        plank.position.y = 0.1;
        const a = (i * Math.PI) / 2;
        plank.position.x = Math.cos(a) * (TILE / 2 - 0.08);
        plank.position.z = Math.sin(a) * (TILE / 2 - 0.08);
        plank.rotation.y = a;
        g.add(plank);
      }
      g.position.set(t.x * TILE, 0, t.z * TILE);
      return g;
    }

    function rebuildRaft() {
      const wanted = new Set(stateRef.current.tiles.map(tileKey));
      for (const [k, m] of tileMeshes) {
        if (!wanted.has(k)) {
          raftRoot.remove(m);
          tileMeshes.delete(k);
        }
      }
      for (const t of stateRef.current.tiles) {
        const k = tileKey(t);
        if (!tileMeshes.has(k)) {
          const m = buildTileMesh(t);
          raftRoot.add(m);
          tileMeshes.set(k, m);
        }
      }
    }
    rebuildRaft();

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.9 })
    );
    mast.position.set(0.5 * TILE, 1.3, 0.5 * TILE);
    raftRoot.add(mast);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xe8a23a, side: THREE.DoubleSide, roughness: 0.7 })
    );
    flag.position.set(0.5 * TILE + 0.4, 2.2, 0.5 * TILE);
    raftRoot.add(flag);

    const ghostGeo = new THREE.BoxGeometry(TILE, 0.18, TILE);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x6cf0c8,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const ghost = new THREE.Mesh(ghostGeo, ghostMat);
    ghost.visible = false;
    raftRoot.add(ghost);

    const floaters: Floater[] = [];
    function spawnFloater(kind: Floater["kind"], pos?: THREE.Vector3) {
      let mesh: THREE.Object3D;
      if (kind === "wood") {
        mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, 1.1, 8),
          new THREE.MeshStandardMaterial({ color: 0x7a4d24, roughness: 0.9 })
        );
        mesh.rotation.z = Math.PI / 2;
      } else if (kind === "plastic") {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.3, 0.7),
          new THREE.MeshStandardMaterial({ color: 0xd8d4c4, roughness: 0.4 })
        );
      } else if (kind === "food") {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0xd25a3a, roughness: 0.55 })
        );
      } else {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.45, 0.2, 0.45),
          new THREE.MeshStandardMaterial({ color: 0x6e6e72, metalness: 0.6, roughness: 0.5 })
        );
      }
      const p = pos ?? new THREE.Vector3(
        camera.position.x + (Math.random() - 0.5) * 70,
        0,
        camera.position.z + (Math.random() - 0.5) * 70
      );
      mesh.position.copy(p);
      scene.add(mesh);
      floaters.push({ mesh, kind, phase: Math.random() * Math.PI * 2 });
    }
    for (let i = 0; i < 16; i++) {
      const r = Math.random();
      spawnFloater(r < 0.55 ? "wood" : r < 0.8 ? "plastic" : r < 0.93 ? "scrap" : "food");
    }

    const sharkMat = new THREE.MeshStandardMaterial({ color: 0x46525e, roughness: 0.6 });
    function makeShark(): Shark {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.2, 12), sharkMat);
      body.rotation.z = -Math.PI / 2;
      g.add(body);
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 4), sharkMat);
      fin.position.set(0, 0.5, 0);
      fin.rotation.x = Math.PI;
      g.add(fin);
      scene.add(g);
      return { mesh: g, angle: Math.random() * Math.PI * 2, radius: 22, speed: 0.25, aggro: 0 };
    }
    const shark = makeShark();

    const hookMat = new THREE.MeshStandardMaterial({ color: 0x8a8276, metalness: 0.7, roughness: 0.4 });
    const hookMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), hookMat);
    hookMesh.visible = false;
    scene.add(hookMesh);
    const ropeMat = new THREE.LineBasicMaterial({ color: 0xddd2bd });
    const ropeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const rope = new THREE.Line(ropeGeo, ropeMat);
    rope.visible = false;
    scene.add(rope);

    type HookState = {
      active: boolean;
      mode: "out" | "return";
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      origin: THREE.Vector3;
      grabbed?: Floater;
    };
    const hook: HookState = {
      active: false,
      mode: "out",
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      origin: new THREE.Vector3(),
    };

    function throwHook() {
      if (hook.active) return;
      hook.active = true;
      hook.mode = "out";
      hook.pos.copy(camera.position);
      hook.origin.copy(camera.position);
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      hook.vel.copy(dir).multiplyScalar(28);
      hookMesh.visible = true;
      rope.visible = true;
      hook.grabbed = undefined;
    }

    function tryPlaceTile() {
      const s = stateRef.current;
      if (s.resources.wood < 2) {
        showToast("Precisa de 2 Madeira");
        return;
      }
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const t = -camera.position.y / dir.y;
      if (t <= 0 || t > 8) {
        showToast("Mire na borda da jangada");
        return;
      }
      const hit = new THREE.Vector3().copy(camera.position).add(dir.multiplyScalar(t));
      const gx = Math.round(hit.x / TILE);
      const gz = Math.round(hit.z / TILE);
      const exists = s.tiles.some((tt) => tt.x === gx && tt.z === gz);
      if (exists) {
        showToast("Já existe um piso aqui");
        return;
      }
      const adjacent = s.tiles.some(
        (tt) => Math.abs(tt.x - gx) + Math.abs(tt.z - gz) === 1
      );
      if (!adjacent) {
        showToast("Deve ser adjacente");
        return;
      }
      setState((cur) => ({
        ...cur,
        tiles: [...cur.tiles, { x: gx, z: gz }],
        resources: { ...cur.resources, wood: cur.resources.wood - 2 },
      }));
      showToast(`Piso construído (${gx}, ${gz})`);
    }

    apiRef.current = { tryPlaceTile, throwHook };

    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === "KeyB") setBuildMode((v) => !v);
      if (e.code === "KeyC") setShowCraft((v) => !v);
      if (e.code === "KeyE") {
        if (buildModeRef.current) tryPlaceTile();
      }
      if (e.code === "Escape") {
        document.exitPointerLock();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const yawRef = { v: 0 };
    const pitchRef = { v: 0 };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      yawRef.v -= e.movementX * 0.0022;
      pitchRef.v -= e.movementY * 0.0022;
      pitchRef.v = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitchRef.v));
    };
    window.addEventListener("mousemove", onMouseMove);

    const onClick = () => {
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
        return;
      }
      if (buildModeRef.current) tryPlaceTile();
      else throwHook();
    };
    renderer.domElement.addEventListener("click", onClick);

    const onLockChange = () => {
      setPointerLocked(document.pointerLockElement === renderer.domElement);
    };
    document.addEventListener("pointerlockchange", onLockChange);

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    let statAccum = 0;
    let lastTime = performance.now();

    const tmpV = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();

    let rafId = 0;
    let lastTileCount = stateRef.current.tiles.length;
    const start = performance.now();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const now = performance.now();
      if (stateRef.current.tiles.length !== lastTileCount) {
        rebuildRaft();
        lastTileCount = stateRef.current.tiles.length;
      }
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const t = (now - start) / 1000;

      camera.rotation.order = "YXZ";
      camera.rotation.y = yawRef.v;
      camera.rotation.x = pitchRef.v;

      const speed = 3.2 * dt;
      fwd.set(-Math.sin(yawRef.v), 0, -Math.cos(yawRef.v));
      right.set(Math.cos(yawRef.v), 0, -Math.sin(yawRef.v));
      const move = new THREE.Vector3();
      if (keys["KeyW"]) move.add(fwd);
      if (keys["KeyS"]) move.sub(fwd);
      if (keys["KeyD"]) move.add(right);
      if (keys["KeyA"]) move.sub(right);
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(speed);
        const nx = camera.position.x + move.x;
        const nz = camera.position.z + move.z;
        const tiles = stateRef.current.tiles;
        const inTile = tiles.some(
          (tt) =>
            nx > tt.x * TILE - TILE / 2 - 0.1 &&
            nx < tt.x * TILE + TILE / 2 + 0.1 &&
            nz > tt.z * TILE - TILE / 2 - 0.1 &&
            nz < tt.z * TILE + TILE / 2 + 0.1
        );
        if (inTile) {
          camera.position.x = nx;
          camera.position.z = nz;
        }
      }

      const cx = 0.5 * TILE, cz = 0.5 * TILE;
      const h0 = sampleWaveHeight(cx, cz, t);
      const hx = sampleWaveHeight(cx + 1, cz, t);
      const hz = sampleWaveHeight(cx, cz + 1, t);
      raftRoot.position.y = h0 * 0.7;
      raftRoot.rotation.z = -(hx - h0) * 0.3;
      raftRoot.rotation.x = (hz - h0) * 0.3;

      camera.position.y = raftRoot.position.y + 1.7;

      (oceanMat.uniforms.uTime.value as number) = t;
      ocean.position.x = camera.position.x;
      ocean.position.z = camera.position.z;

      const tod = ((stateRef.current.timeOfDay + dt / 360) % 1 + 1) % 1;
      const sunAngle = tod * Math.PI * 2 - Math.PI / 2;
      const sunDir = new THREE.Vector3(Math.cos(sunAngle), Math.sin(sunAngle), 0.25).normalize();
      sun.position.copy(sunDir).multiplyScalar(80);
      const dayFactor = Math.max(0, sunDir.y);
      const nightFactor = Math.max(0, -sunDir.y * 0.7 + 0.1);
      sun.intensity = 0.2 + dayFactor * 1.6;
      ambient.intensity = 0.25 + dayFactor * 0.5;

      const topDay = new THREE.Color(0.32, 0.55, 0.85);
      const topNight = new THREE.Color(0.02, 0.03, 0.08);
      const horDay = new THREE.Color(0.85, 0.78, 0.68);
      const horDusk = new THREE.Color(0.95, 0.45, 0.25);
      const horNight = new THREE.Color(0.05, 0.05, 0.12);
      const dusk = Math.pow(Math.max(0, 1 - Math.abs(sunDir.y) * 3), 2);
      const topCol = topDay.clone().lerp(topNight, 1 - dayFactor);
      const horCol = horDay.clone().lerp(horDusk, dusk).lerp(horNight, Math.max(0, -sunDir.y));

      const skyMat = (sky.material as THREE.ShaderMaterial);
      (skyMat.uniforms.uSunDir.value as THREE.Vector3).copy(sunDir);
      (skyMat.uniforms.uTop.value as THREE.Color).copy(topCol);
      (skyMat.uniforms.uHorizon.value as THREE.Color).copy(horCol);
      (skyMat.uniforms.uNight.value as number) = nightFactor;

      (oceanMat.uniforms.uSunDir.value as THREE.Vector3).copy(sunDir);
      (oceanMat.uniforms.uSkyTop.value as THREE.Color).copy(topCol);
      (oceanMat.uniforms.uSkyHorizon.value as THREE.Color).copy(horCol);

      scene.fog!.color.copy(horCol);
      renderer.toneMappingExposure = 0.85 + dayFactor * 0.45;

      for (const f of floaters) {
        const wy = sampleWaveHeight(f.mesh.position.x, f.mesh.position.z, t);
        f.mesh.position.y = wy + 0.1;
        f.mesh.rotation.y += dt * 0.2;
      }

      if (Math.random() < 0.012 && floaters.length < 28) {
        const r = Math.random();
        spawnFloater(r < 0.55 ? "wood" : r < 0.8 ? "plastic" : r < 0.93 ? "scrap" : "food");
      }

      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        const d = f.mesh.position.distanceTo(camera.position);
        if (d > 90) {
          scene.remove(f.mesh);
          floaters.splice(i, 1);
        }
      }

      shark.angle += dt * shark.speed * (1 + shark.aggro);
      const sx = camera.position.x + Math.cos(shark.angle) * shark.radius;
      const sz = camera.position.z + Math.sin(shark.angle) * shark.radius;
      shark.mesh.position.set(sx, sampleWaveHeight(sx, sz, t) - 0.4, sz);
      shark.mesh.rotation.y = -shark.angle + Math.PI / 2;

      if (hook.active) {
        if (hook.mode === "out") {
          hook.pos.addScaledVector(hook.vel, dt);
          for (const f of floaters) {
            if (hook.pos.distanceTo(f.mesh.position) < 0.6) {
              hook.grabbed = f;
              hook.mode = "return";
              break;
            }
          }
          if (hook.pos.distanceTo(camera.position) > 22) hook.mode = "return";
        } else {
          const dir = tmpV.copy(camera.position).sub(hook.pos).normalize();
          hook.pos.addScaledVector(dir, 18 * dt);
          if (hook.grabbed) {
            hook.grabbed.mesh.position.copy(hook.pos);
          }
          if (hook.pos.distanceTo(camera.position) < 1.2) {
            if (hook.grabbed) {
              const kind = hook.grabbed.kind;
              scene.remove(hook.grabbed.mesh);
              floaters.splice(floaters.indexOf(hook.grabbed), 1);
              setState((cur) => {
                const r = { ...cur.resources };
                if (kind === "wood") r.wood += 1;
                else if (kind === "plastic") r.plastic += 1;
                else if (kind === "scrap") r.scrap += 1;
                else if (kind === "food") r.food += 1;
                return { ...cur, resources: r };
              });
              showToast(
                `+1 ${
                  kind === "wood" ? "Madeira" : kind === "plastic" ? "Plástico" : kind === "scrap" ? "Sucata" : "Comida"
                }`
              );
            }
            hook.active = false;
            hookMesh.visible = false;
            rope.visible = false;
          }
        }
        hookMesh.position.copy(hook.pos);
        const positions = (rope.geometry as THREE.BufferGeometry).getAttribute("position") as THREE.BufferAttribute;
        const handPos = camera.position.clone().add(new THREE.Vector3(0, -0.3, 0));
        positions.setXYZ(0, handPos.x, handPos.y, handPos.z);
        positions.setXYZ(1, hook.pos.x, hook.pos.y, hook.pos.z);
        positions.needsUpdate = true;
      }

      ghost.visible = buildModeRef.current;
      if (buildModeRef.current) {
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        const tt = -camera.position.y / dir.y;
        if (tt > 0 && tt < 8) {
          const hit = new THREE.Vector3().copy(camera.position).add(dir.multiplyScalar(tt));
          const gx = Math.round(hit.x / TILE);
          const gz = Math.round(hit.z / TILE);
          ghost.position.set(gx * TILE, 0.05, gz * TILE);
          const tiles = stateRef.current.tiles;
          const exists = tiles.some((t) => t.x === gx && t.z === gz);
          const adjacent = tiles.some(
            (t) => Math.abs(t.x - gx) + Math.abs(t.z - gz) === 1
          );
          (ghost.material as THREE.MeshBasicMaterial).color.set(
            exists ? 0xff5a5a : adjacent ? 0x6cf0c8 : 0xffc66c
          );
        } else {
          ghost.visible = false;
        }
      }

      statAccum += dt;
      if (statAccum >= 1) {
        statAccum = 0;
        setState((cur) => {
          if (cur.dead) return cur;
          const hunger = Math.max(0, cur.hunger.value - 0.35);
          const thirst = Math.max(0, cur.thirst.value - 0.55);
          const energy = Math.max(0, cur.energy.value - 0.15);
          let health = cur.health.value;
          if (hunger <= 0 || thirst <= 0) health = Math.max(0, health - 0.8);
          else if (hunger < 20 || thirst < 20) health = Math.max(0, health - 0.2);
          else health = Math.min(cur.health.max, health + 0.1);
          const tod = ((cur.timeOfDay + 1 / 360) % 1 + 1) % 1;
          const day = tod < cur.timeOfDay ? cur.day + 1 : cur.day;
          return {
            ...cur,
            hunger: { ...cur.hunger, value: hunger },
            thirst: { ...cur.thirst, value: thirst },
            energy: { ...cur.energy, value: energy },
            health: { ...cur.health, value: health },
            timeOfDay: tod,
            day,
            dead: health <= 0,
          };
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("pointerlockchange", onLockChange);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [started, showToast]);

  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => {
    }, 1000);
    return () => clearInterval(id);
  }, [started]);

  const craft = useCallback(
    (recipe: "purifier" | "grill" | "expand") => {
      const r = state.resources;
      if (recipe === "purifier") {
        if (r.plastic < 2 || r.scrap < 1) return showToast("Faltam recursos (2P+1S)");
        setState((c) => ({
          ...c,
          resources: { ...c.resources, plastic: c.resources.plastic - 2, scrap: c.resources.scrap - 1, water: c.resources.water + 3 },
        }));
        showToast("+3 Água purificada");
      } else if (recipe === "grill") {
        if (r.wood < 2 || r.scrap < 1) return showToast("Faltam recursos (2W+1S)");
        if (r.food < 1) return showToast("Sem comida crua");
        setState((c) => ({
          ...c,
          resources: { ...c.resources, wood: c.resources.wood - 2, scrap: c.resources.scrap - 1, food: c.resources.food },
          hunger: { ...c.hunger, value: Math.min(c.hunger.max, c.hunger.value + 30) },
        }));
        showToast("Comida grelhada (+30 Fome)");
      } else if (recipe === "expand") {
        apiRef.current?.tryPlaceTile();
      }
    },
    [state, showToast]
  );

  const consume = useCallback(
    (what: "food" | "water") => {
      setState((c) => {
        const r = { ...c.resources };
        if (what === "food" && r.food > 0) {
          r.food -= 1;
          return {
            ...c,
            resources: r,
            hunger: { ...c.hunger, value: Math.min(c.hunger.max, c.hunger.value + 18) },
          };
        }
        if (what === "water" && r.water > 0) {
          r.water -= 1;
          return {
            ...c,
            resources: r,
            thirst: { ...c.thirst, value: Math.min(c.thirst.max, c.thirst.value + 22) },
          };
        }
        return c;
      });
    },
    []
  );

  if (!started) {
    return <MainMenu onStart={() => setStarted(true)} />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <div ref={mountRef} className="absolute inset-0" />
      <HUD
        state={state}
        buildMode={buildMode}
        showCraft={showCraft}
        toast={toast}
        pointerLocked={pointerLocked}
        onCraft={craft}
        onConsume={consume}
        onToggleBuild={() => setBuildMode((v) => !v)}
        onCloseCraft={() => setShowCraft(false)}
        onRestart={() => {
          setState(initialState());
        }}
      />
    </div>
  );
}
