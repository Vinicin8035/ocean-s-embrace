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

  // hash for star field
  float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }

  void main() {
    vec3 dir = normalize(vDir);
    float t = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uHorizon, uTop, pow(t, 0.5));

    // sun disc
    float sd = max(dot(dir, normalize(uSunDir)), 0.0);
    col += uSunColor * pow(sd, 800.0) * 6.0;
    col += uSunColor * pow(sd, 16.0) * 0.25;

    // stars at night
    if (uNight > 0.05 && dir.y > 0.0) {
      vec2 uv = dir.xz / max(dir.y, 0.05);
      vec2 g = floor(uv * 220.0);
      float s = hash(g);
      float star = smoothstep(0.997, 1.0, s) * uNight;
      col += vec3(0.9, 0.95, 1.0) * star * 1.2;
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
      uTop: { value: new THREE.Color(0.32, 0.55, 0.85) },
      uHorizon: { value: new THREE.Color(0.85, 0.78, 0.68) },
      uSunColor: { value: new THREE.Color(1.0, 0.92, 0.78) },
      uNight: { value: 0 },
      uTime: { value: 0 },
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}
