import * as THREE from "three";

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;

const skyFrag = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  uniform vec3 uSunDir;
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uSunColor;
  uniform float uNight;
  uniform float uTime;

  float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x),
               mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 dir = normalize(vDir);
    float t = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uHorizon, uTop, pow(t, 0.45));

    // sun disc + bloom halo
    float sd = max(dot(dir, normalize(uSunDir)), 0.0);
    col += uSunColor * pow(sd, 1200.0) * 7.0;
    col += uSunColor * pow(sd, 22.0) * 0.3;
    col += uSunColor * pow(sd, 4.0) * 0.08;

    // drifting clouds
    if (dir.y > 0.02) {
      vec2 uv = dir.xz / max(dir.y, 0.08);
      float c = fbm(uv * 0.55 + vec2(uTime * 0.008, uTime * 0.004));
      float cover = smoothstep(0.52, 0.85, c) * smoothstep(0.02, 0.28, dir.y);
      vec3 cloudCol = mix(vec3(0.72, 0.66, 0.55), uSunColor, 0.35) * (0.35 + 0.65 * (1.0 - uNight));
      col = mix(col, cloudCol, cover * 0.55);
    }

    // stars at night
    if (uNight > 0.05 && dir.y > 0.0) {
      vec2 uv = dir.xz / max(dir.y, 0.05);
      vec2 g = floor(uv * 220.0);
      float s = hash(g);
      float star = smoothstep(0.997, 1.0, s) * uNight;
      col += vec3(0.85, 0.9, 1.0) * star * 1.2;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createSky() {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.ShaderMaterial({
    vertexShader: skyVert,
    fragmentShader: skyFrag,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.2) },
      uTop: { value: new THREE.Color(0.05, 0.2, 0.4) },
      uHorizon: { value: new THREE.Color(0.85, 0.66, 0.38) },
      uSunColor: { value: new THREE.Color(1.0, 0.78, 0.45) },
      uNight: { value: 0 },
      uTime: { value: 0 },
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}
