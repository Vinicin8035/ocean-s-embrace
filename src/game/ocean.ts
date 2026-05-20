import * as THREE from "three";

export const oceanVertex = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vFoam;

  // Gerstner wave
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

    offset += gerstner(pos.xz, vec2(1.0, 0.6), 0.18, 18.0, 1.0, uTime, tangent, binormal);
    offset += gerstner(pos.xz, vec2(-0.7, 1.0), 0.14, 11.0, 1.2, uTime, tangent, binormal);
    offset += gerstner(pos.xz, vec2(0.3, -1.0), 0.10, 7.0, 1.5, uTime, tangent, binormal);
    offset += gerstner(pos.xz, vec2(-1.0, -0.4), 0.07, 4.5, 1.8, uTime, tangent, binormal);

    pos.x += offset.x;
    pos.z += offset.z;
    pos.y += offset.y;

    vec3 n = normalize(cross(binormal, tangent));
    vNormal = n;
    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vWorldPos = wp.xyz;
    vFoam = smoothstep(0.35, 0.9, offset.y);

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
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vFoam;

  vec3 skyColor(vec3 dir) {
    float t = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    return mix(uSkyHorizon, uSkyTop, pow(t, 0.6));
  }

  void main() {
    vec3 V = normalize(uCamPos - vWorldPos);
    vec3 N = normalize(vNormal);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);

    vec3 R = reflect(-V, N);
    vec3 reflCol = skyColor(R);

    // depth tint by distance
    float dist = length(uCamPos.xz - vWorldPos.xz);
    float depthMix = smoothstep(5.0, 80.0, dist);
    vec3 waterCol = mix(uShallow, uDeep, depthMix);

    // Sun specular
    vec3 H = normalize(uSunDir + V);
    float spec = pow(max(dot(N, H), 0.0), 120.0);
    vec3 sunSpec = uSunColor * spec * 2.5;

    vec3 col = mix(waterCol, reflCol, clamp(fres + 0.1, 0.0, 1.0));
    col += sunSpec;

    // foam crests
    float foam = vFoam;
    col = mix(col, vec3(0.95, 0.97, 1.0), foam * 0.65);

    // subtle horizon fog
    float fog = smoothstep(120.0, 400.0, dist);
    col = mix(col, uSkyHorizon, fog * 0.9);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function sampleWaveHeight(x: number, z: number, t: number): number {
  // Mirror of GPU Gerstner for buoyancy (vertical contribution only, approximate)
  const waves: Array<[number, number, number, number, number]> = [
    // dirX, dirZ, steepness, wavelength, speed
    [1.0, 0.6, 0.18, 18.0, 1.0],
    [-0.7, 1.0, 0.14, 11.0, 1.2],
    [0.3, -1.0, 0.10, 7.0, 1.5],
    [-1.0, -0.4, 0.07, 4.5, 1.8],
  ];
  let y = 0;
  for (const [dx, dz, steep, wl, sp] of waves) {
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
      uSunColor: { value: new THREE.Color(1.0, 0.92, 0.78) },
      uShallow: { value: new THREE.Color(0.18, 0.55, 0.62) },
      uDeep: { value: new THREE.Color(0.02, 0.08, 0.16) },
      uSkyTop: { value: new THREE.Color(0.32, 0.55, 0.85) },
      uSkyHorizon: { value: new THREE.Color(0.85, 0.78, 0.68) },
      uCamPos: { value: camPosRef },
    },
  });
}
