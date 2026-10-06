import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from "three";
import { poseAt } from "@/lib/ribbon-gate";

// The landing page light ribbon. Only RibbonBackground loads this file, with a dynamic import,
// so three stays out of every other page's bundle.

// The path the ribbon follows. The camera travels along it as the page scrolls.
const PATH = [
  [-16, -4, 2],
  [-8, 2, -2],
  [0, -1, -6],
  [7, 3, -11],
  [13, -2, -16],
  [18, 2, -22],
  [23, -1, -28],
  [28, 2, -34],
  [33, 0, -40],
].map(([x, y, z]) => new Vector3(x, y, z));

// A few strands of different width and twist give the bundle-of-light look.
const STRANDS = [
  { width: 2.6, twist: 1.4, phase: 0, drift: 0.5, opacity: 0.9 },
  { width: 1.5, twist: -1.1, phase: 1.7, drift: 0.9, opacity: 0.65 },
  { width: 3.6, twist: 0.7, phase: 3.1, drift: 0.7, opacity: 0.35 },
];

const SEGMENTS = 600;

// Fit Green and pale Fit Green, as sRGB 0 to 1.
const GREEN = [175 / 255, 250 / 255, 0];
const PALE = [207 / 255, 237 / 255, 137 / 255];

const vertexShader = /* glsl */ `
  attribute vec3 aSide;
  uniform float uTime;
  uniform float uPhase;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position + aSide * sin(uv.x * 18.0 + uTime * 0.6 + uPhase) * 0.25;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

// uSoft 0 shows fine bright lines across the ribbon; 1 melts them into a dim glow.
// The glow dims quickly as soon as the hero scrolls away, so grey body text on top keeps its contrast.
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSoft;
  uniform float uOpacity;
  uniform vec3 uGreen;
  uniform vec3 uPale;
  varying vec2 vUv;
  void main() {
    float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
    float body = pow(across, mix(1.4, 0.7, uSoft));
    float lines = pow(0.5 + 0.5 * cos(vUv.y * 6.2832 * 12.0), 8.0);
    float detail = mix(lines * 1.3 + 0.12, 0.45, uSoft);
    float sheen = 0.6 + 0.4 * sin(vUv.x * 30.0 - uTime * 0.9);
    float ends = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
    vec3 color = mix(uGreen, uPale, clamp(vUv.y * 0.7 + 0.3 * sin(vUv.x * 5.0 + uTime * 0.2), 0.0, 1.0));
    float a = clamp(body * detail * sheen * ends * uOpacity * mix(1.0, 0.12, smoothstep(0.0, 0.4, uSoft)), 0.0, 1.0);
    gl_FragColor = vec4(color * a, a);
  }
`;

function strandGeometry(curve: CatmullRomCurve3, strand: (typeof STRANDS)[number]): BufferGeometry {
  const frames = curve.computeFrenetFrames(SEGMENTS, false);
  const count = (SEGMENTS + 1) * 2;
  const positions = new Float32Array(count * 3);
  const sides = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const indices: number[] = [];
  const side = new Vector3();
  const center = new Vector3();

  for (let i = 0; i <= SEGMENTS; i++) {
    const u = i / SEGMENTS;
    curve.getPointAt(u, center);
    const angle = strand.phase + strand.twist * Math.PI * 2 * u;
    const normal = frames.normals[i];
    const binormal = frames.binormals[i];
    side.copy(normal).multiplyScalar(Math.cos(angle)).addScaledVector(binormal, Math.sin(angle));
    center.addScaledVector(normal, Math.sin(u * Math.PI * 3 + strand.phase) * strand.drift);
    const half = (strand.width * (0.55 + 0.45 * Math.sin(u * Math.PI))) / 2;

    for (let s = 0; s < 2; s++) {
      const k = i * 2 + s;
      const sign = s === 0 ? -1 : 1;
      positions[k * 3] = center.x + side.x * half * sign;
      positions[k * 3 + 1] = center.y + side.y * half * sign;
      positions[k * 3 + 2] = center.z + side.z * half * sign;
      sides[k * 3] = side.x;
      sides[k * 3 + 1] = side.y;
      sides[k * 3 + 2] = side.z;
      uvs[k * 2] = u;
      uvs[k * 2 + 1] = s;
    }
    if (i < SEGMENTS) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSide", new BufferAttribute(sides, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

type Callbacks = {
  // Fractional stop index for the current scroll position (0 = hero).
  getIndex: () => number;
  // First frame is on screen; the static fallback can fade out.
  onReady: () => void;
  // WebGL went away; go back to the static fallback.
  onLost: () => void;
};

// Starts the scene on the canvas and returns a function that stops it and frees the GPU memory.
// Throws if WebGL cannot start; the caller keeps the static fallback.
export function startRibbon(canvas: HTMLCanvasElement, { getIndex, onReady, onLost }: Callbacks): () => void {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 200);
  const curve = new CatmullRomCurve3(PATH);

  const materials = STRANDS.map(
    (strand) =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uPhase: { value: strand.phase },
          uSoft: { value: 0 },
          uOpacity: { value: strand.opacity },
          uGreen: { value: GREEN },
          uPale: { value: PALE },
        },
        transparent: true,
        premultipliedAlpha: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
  );
  const geometries = STRANDS.map((strand) => strandGeometry(curve, strand));
  geometries.forEach((geometry, i) => scene.add(new Mesh(geometry, materials[i])));

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  const handleLost = (event: Event) => {
    event.preventDefault();
    onLost();
  };
  canvas.addEventListener("webglcontextlost", handleLost);

  const point = new Vector3();
  const look = new Vector3();
  let index = getIndex();
  let last = performance.now();
  let frame = 0;
  let ready = false;

  const draw = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    // Glide toward the scroll position instead of jumping.
    index += (getIndex() - index) * (1 - Math.exp(-dt * 4));
    const pose = poseAt(index);
    curve.getPointAt(pose.t, point);
    look.set(point.x + pose.shift[0], point.y + pose.shift[1], point.z + pose.shift[2]);
    camera.position.set(point.x + pose.offset[0], point.y + pose.offset[1], point.z + pose.offset[2]);
    camera.lookAt(look);
    for (const material of materials) {
      material.uniforms.uTime.value = now / 1000;
      material.uniforms.uSoft.value = pose.soft;
    }
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      onReady();
    }
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("webglcontextlost", handleLost);
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  };
}
