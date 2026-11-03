import type { ExpoWebGLRenderingContext } from "expo-gl";
import { PerspectiveCamera } from "three/src/cameras/PerspectiveCamera.js";
import { CatmullRomCurve3 } from "three/src/extras/curves/CatmullRomCurve3.js";
import { Vector3 } from "three/src/math/Vector3.js";
import { GLIDE_DEFAULT, RIBBON_KEYFRAMES_NARROW, poseAt } from "@/lib/ribbon-gate";

// The web's light ribbon (src/components/ribbon-scene.ts) in the phone's GL view. The path, strands,
// shaders and camera are the same as the web's "lite" (phone) scene; keep them in step. three is used only
// for the curve and camera maths: the drawing is plain GL, because three's renderer expects a browser canvas.

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

const STRANDS = [
  { width: 2.6, twist: 1.4, phase: 0, drift: 0.5, opacity: 0.9 },
  { width: 1.5, twist: -1.1, phase: 1.7, drift: 0.9, opacity: 0.65 },
  { width: 3.6, twist: 0.7, phase: 3.1, drift: 0.7, opacity: 0.35 },
];

// The web's lite settings: 240 segments and about 30 fps. While the camera glides to a new stop the scene
// draws every frame instead, so scrolling stays smooth; once it settles it drops back to 30 fps.
const SEGMENTS = 240;
const SETTLED_FRAME_MS = 1000 / 30;
const SETTLED = 0.002;

// Every time-based wave in the shaders repeats after 20π seconds, so the clock wraps there. It stays small,
// which keeps the phone GPU's float maths exact however long the screen stays open.
const CLOCK_WRAP = 20 * Math.PI;

const GREEN = new Float32Array([175 / 255, 250 / 255, 0]);
const PALE = new Float32Array([207 / 255, 237 / 255, 137 / 255]);

const vertexShader = `
  precision highp float;
  attribute vec3 position;
  attribute vec3 aSide;
  attribute vec2 uv;
  uniform mat4 projectionMatrix;
  uniform mat4 viewMatrix;
  uniform float uTime;
  uniform float uPhase;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position + aSide * sin(uv.x * 18.0 + uTime * 0.6 + uPhase) * 0.25;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform float uTime;
  uniform float uBright;
  uniform float uOpacity;
  uniform vec3 uGreen;
  uniform vec3 uPale;
  varying vec2 vUv;
  void main() {
    float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
    float body = pow(across, 1.4);
    float lines = pow(0.5 + 0.5 * cos(vUv.y * 6.2832 * 12.0), 8.0);
    float detail = lines * 1.3 + 0.12;
    float sheen = 0.6 + 0.4 * sin(vUv.x * 30.0 - uTime * 0.9);
    float ends = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
    vec3 color = mix(uGreen, uPale, clamp(vUv.y * 0.7 + 0.3 * sin(vUv.x * 5.0 + uTime * 0.2), 0.0, 1.0));
    float a = clamp(body * detail * sheen * ends * uOpacity * uBright, 0.0, 1.0);
    gl_FragColor = vec4(color * a, a);
  }
`;

type StrandData = { positions: Float32Array; sides: Float32Array; uvs: Float32Array; indices: Uint16Array };

const curve = new CatmullRomCurve3(PATH);
let strandCache: StrandData[] | undefined;

// The same strip as the web's strandGeometry. Built once and shared by every screen that shows the ribbon.
function strands(): StrandData[] {
  if (strandCache) return strandCache;
  const frames = curve.computeFrenetFrames(SEGMENTS, false);
  strandCache = STRANDS.map((strand) => {
    const count = (SEGMENTS + 1) * 2;
    const positions = new Float32Array(count * 3);
    const sides = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);
    const indices = new Uint16Array(SEGMENTS * 6);
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
        indices.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6);
      }
    }
    return { positions, sides, uvs, indices };
  });
  return strandCache;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("ribbon: no shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`ribbon: ${gl.getShaderInfoLog(shader) ?? "shader failed"}`);
  return shader;
}

function buffer(gl: WebGLRenderingContext, target: number, data: Float32Array | Uint16Array): WebGLBuffer {
  const handle = gl.createBuffer();
  if (!handle) throw new Error("ribbon: no buffer");
  gl.bindBuffer(target, handle);
  gl.bufferData(target, data, gl.STATIC_DRAW);
  return handle;
}

type Callbacks = {
  // Fractional stop index for the current scroll position (0 = hero).
  getIndex: () => number;
  // The first frame is on screen; the static ribbon can fade out.
  onReady: () => void;
};

export type RibbonHandle = {
  // Pauses the loop when the screen is hidden or the app is in the background, and resumes it.
  setPlaying: (playing: boolean) => void;
  stop: () => void;
};

// Starts the scene in a GL view's context. Throws if GL cannot draw it; the caller keeps the static ribbon.
export function startRibbon(gl: ExpoWebGLRenderingContext, { getIndex, onReady }: Callbacks): RibbonHandle {
  const program = gl.createProgram();
  if (!program) throw new Error("ribbon: no program");
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexShader));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentShader));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`ribbon: ${gl.getProgramInfoLog(program) ?? "link failed"}`);
  gl.useProgram(program);

  const attribute = (name: string) => gl.getAttribLocation(program, name);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const at = { position: attribute("position"), side: attribute("aSide"), uv: attribute("uv") };
  const u = {
    projection: uniform("projectionMatrix"),
    view: uniform("viewMatrix"),
    time: uniform("uTime"),
    phase: uniform("uPhase"),
    bright: uniform("uBright"),
    opacity: uniform("uOpacity"),
  };
  gl.uniform3fv(uniform("uGreen"), GREEN);
  gl.uniform3fv(uniform("uPale"), PALE);
  gl.enableVertexAttribArray(at.position);
  gl.enableVertexAttribArray(at.side);
  gl.enableVertexAttribArray(at.uv);

  const meshes = strands().map((data, i) => ({
    strand: STRANDS[i],
    count: data.indices.length,
    positions: buffer(gl, gl.ARRAY_BUFFER, data.positions),
    sides: buffer(gl, gl.ARRAY_BUFFER, data.sides),
    uvs: buffer(gl, gl.ARRAY_BUFFER, data.uvs),
    indices: buffer(gl, gl.ELEMENT_ARRAY_BUFFER, data.indices),
  }));

  // three's AdditiveBlending with premultiplied colour, both sides drawn, nothing written to depth.
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.clearColor(0, 0, 0, 0);

  const camera = new PerspectiveCamera(45, 1, 0.1, 200);
  const point = new Vector3();
  const look = new Vector3();
  let width = 0;
  let height = 0;
  let index = getIndex();
  let last = 0;
  let clock = 0;
  let frame: number | undefined;
  let ready = false;
  let stopped = false;

  const render = (dt: number) => {
    // The GL view keeps its size when the keyboard opens (see RibbonBackground), so this changes only on rotation.
    if (gl.drawingBufferWidth !== width || gl.drawingBufferHeight !== height) {
      width = gl.drawingBufferWidth;
      height = gl.drawingBufferHeight;
      gl.viewport(0, 0, width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      gl.uniformMatrix4fv(u.projection, false, new Float32Array(camera.projectionMatrix.elements));
    }
    clock = (clock + dt) % CLOCK_WRAP;
    // Glide toward the scroll position instead of jumping, at the web's speed.
    index += (getIndex() - index) * (1 - Math.exp(-dt * GLIDE_DEFAULT));
    const pose = poseAt(index, RIBBON_KEYFRAMES_NARROW);
    curve.getPointAt(pose.t, point);
    look.set(point.x + pose.shift[0], point.y + pose.shift[1], point.z + pose.shift[2]);
    camera.position.set(point.x + pose.offset[0], point.y + pose.offset[1], point.z + pose.offset[2]);
    camera.lookAt(look);
    camera.updateMatrixWorld();

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(u.view, false, new Float32Array(camera.matrixWorldInverse.elements));
    gl.uniform1f(u.time, clock);
    gl.uniform1f(u.bright, pose.bright);
    for (const mesh of meshes) {
      gl.uniform1f(u.phase, mesh.strand.phase);
      gl.uniform1f(u.opacity, mesh.strand.opacity);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positions);
      gl.vertexAttribPointer(at.position, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.sides);
      gl.vertexAttribPointer(at.side, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uvs);
      gl.vertexAttribPointer(at.uv, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    }
    gl.flush();
    gl.endFrameEXP();
    if (!ready) {
      ready = true;
      onReady();
    }
  };

  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const settled = Math.abs(getIndex() - index) < SETTLED;
    if (settled && now - last < SETTLED_FRAME_MS - 1) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    render(dt);
  };

  const setPlaying = (playing: boolean) => {
    if (stopped || playing === (frame !== undefined)) return;
    if (playing) {
      // Restart the clock from now, so a pause is not one big jump.
      last = performance.now();
      frame = requestAnimationFrame(loop);
    } else if (frame !== undefined) {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
  };

  // One frame straight away, so the ribbon is ready even if the screen starts hidden.
  render(0);

  const stop = () => {
    setPlaying(false);
    stopped = true;
    for (const mesh of meshes) [mesh.positions, mesh.sides, mesh.uvs, mesh.indices].forEach((handle) => gl.deleteBuffer(handle));
    gl.deleteProgram(program);
  };
  return { setPlaying, stop };
}
