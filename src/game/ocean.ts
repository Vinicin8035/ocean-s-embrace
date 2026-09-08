import * as THREE from "three";

// Wave set shared by GPU (vertex shader) and CPU (buoyancy sampling)
// [dirX, dirZ, steepness, wavelength, speed]
export const WAVES: Array<[number, number, number, number, number]> = [
  [1.0, 0.6, 0.16, 26.0, 0.9],
  [-0.7, 1.0, 0.13, 15.0, 1.05],
  [0.3, -1.0, 0.10, 9.0, 1.3],
  [-1.0, -0.4, 0.07, 5.5, 1.6],
  [0.8, -0.3, 0.05, 3.2, 1.9],
];

export const oceanVertex = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vFoam;
  varying float vHeight;

  vec3 gerstner(vec2 pos, vec2 dir, float steepness, float wavelength, float speed, float t, inout vec3 tangent, inout vec3 binormal) {
    float k = 6.2831853 / wavelength;
    float c = sqrt(9.8 / k) * speed;
    vec2 d = normalize(dir);
    float f = k * dot(d, pos) - c * t;
    float a = steepness / k;

    tangent += vec3(
      -d.x * d.x * (steepness * sin(f)),
      d.x * (steepness * cos(f)),
      -d.x * d.y * (steepness * sin(f))
    );
    binormal += vec3(
      -d.x * d.y * (steepness * sin(f)),
      d.y * (steepness * cos(f)),
      -d.y * d.y * (steepness * sin(f))
    );
    return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
  }

  void main() {
    vec3 pos = position;
    vec3 tangent = vec3(1.0, 0.0, 0.0);
    vec3 binormal = vec3(0.0, 0.0, 1.0);
    vec3 offset = vec3(0.0);

    offset += gerstner(pos.xz, vec2(1.0, 0.6), 0.16, 26.0, 0.9, uTime, tangent, binormal);
    offset += gerstner(pos.xz, vec2(-0.7, 1.0), 0.13, 15.0, 1.05, uTime, tangent, binormal);
    offset += gerstner(pos.xz, vec2(0.3, -1.0), 0.10, 9.0, 1.3, uTime, tangent, binormal);
    offset += gerstner(pos.xz, vec2(-1.0, -0.4), 0.07, 5.5, 1.6, uTime, tangent, binormal);
    offset += gerstner(pos.xz, vec2(0.8, -0.3), 0.05, 3.2, 1.9, uTime, tangent, binormal);

    pos += offset;

    vec3 n = normalize(cross(binormal, tangent));
    vNormal = n;
    vHeight = offset.y;
    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vWorldPos = wp.xyz;
    vFoam = smoothstep(0.55, 1.15, offset.y);

    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const oceanFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uSkyTop;
  uniform vec3 uSkyHorizon;
  uniform vec3 uCamPos;
  uniform float uTime;
  uniform float uDayFactor;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vFoam;
  varying float vHeight;

  vec3 skyColor(vec3 dir) {
    float t = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    return mix(uSkyHorizon, uSkyTop, pow(t, 0.6));
  }

  // cheap value noise for micro detail
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), u.x),
               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
  }

  void main() {
    vec3 V = normalize(uCamPos - vWorldPos);
    vec3 N = normalize(vNormal);

    // ripple detail normals
    vec2 rp = vWorldPos.xz * 1.6;
    float n1 = noise(rp + vec2(uTime * 0.35, uTime * 0.22));
    float n2 = noise(rp * 2.3 - vec2(uTime * 0.5, uTime * 0.31));
    vec3 detail = normalize(vec3((n1 - 0.5) * 0.35, 1.0, (n2 - 0.5) * 0.35));
    float distFade = 1.0 - smoothstep(0.0, 60.0, length(uCamPos.xz - vWorldPos.xz));
    N = normalize(mix(N, normalize(N + detail - vec3(0.0, 1.0, 0.0)), distFade * 0.8));

    float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
    vec3 R = reflect(-V, N);
    vec3 reflCol = skyColor(R);

    float dist = length(uCamPos.xz - vWorldPos.xz);
    float depthMix = smoothstep(4.0, 70.0, dist);
    vec3 waterCol = mix(uShallow, uDeep, depthMix);

    // subsurface scattering on wave crests facing the sun
    float sss = pow(clamp(vHeight * 0.8 + 0.4, 0.0, 1.0), 2.0)
              * pow(max(dot(V, -normalize(uSunDir)), 0.0), 3.0);
    waterCol += uShallow * sss * 1.4 * uDayFactor;

    // sun specular (broad + tight)
    vec3 H = normalize(normalize(uSunDir) + V);
    float spec = pow(max(dot(N, H), 0.0), 180.0) * 2.2 + pow(max(dot(N, H), 0.0), 24.0) * 0.25;
    vec3 sunSpec = uSunColor * spec;

    vec3 col = mix(waterCol, reflCol, clamp(fres * 0.9 + 0.06, 0.0, 1.0));
    col += sunSpec;

    // foam crests with noise break-up
    float foam = vFoam * (0.55 + 0.45 * noise(vWorldPos.xz * 3.0 + uTime * 0.4));
    col = mix(col, mix(uShallow, vec3(1.0), 0.85), clamp(foam, 0.0, 1.0) * 0.7);

    // horizon fog
    float fog = smoothstep(90.0, 360.0, dist);
    col = mix(col, uSkyHorizon, fog * 0.95);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function sampleWaveHeight(x: number, z: number, t: number): number {
  let y = 0;
  for (const [dx, dz, steep, wl, sp] of WAVES) {
    const len = Math.hypot(dx, dz);
    const ndx = dx / len, ndz = dz / len;
    const k = (Math.PI * 2) / wl;
    const c = Math.sqrt(9.8 / k) * sp;
    const f = k * (ndx * x + ndz * z) - c * t;
    const a = steep / k;
    y += a * Math.sin(f);
  }
  return y;
}

export function createOceanMaterial(camPosRef: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    vertexShader: oceanVertex,
    fragmentShader: oceanFragment,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.2).normalize() },
      uSunColor: { value: new THREE.Color(1.0, 0.78, 0.45) },
      uShallow: { value: new THREE.Color(0.2, 0.33, 0.26) },   // Muted Teal (linear)
      uDeep: { value: new THREE.Color(0.004, 0.05, 0.115) },   // Yale Blue (linear)
      uSkyTop: { value: new THREE.Color(0.05, 0.2, 0.4) },
      uSkyHorizon: { value: new THREE.Color(0.85, 0.66, 0.38) },
      uCamPos: { value: camPosRef },
      uDayFactor: { value: 1 },
    },
  });
}
