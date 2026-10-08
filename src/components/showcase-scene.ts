import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
  type Object3D,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { ShowcaseObject } from "@/lib/showcase";

// The 3D objects for the landing page honest-estimates story (EstimateStory). Modelled here in code (no downloaded models,
// textures or licences), all in one studio: the same camera, key light, lime rim light, reflections
// and contact shadow, and the same graphite, chrome, ceramic and lime materials.
// Only EstimateStory loads this file, with a dynamic import, so three stays out of other bundles.

const LIME = 0xaffa00;

function materials() {
  return {
    chrome: new MeshPhysicalMaterial({ color: 0xdfe3e2, metalness: 1, roughness: 0.16 }),
    rubber: new MeshPhysicalMaterial({ color: 0x1f2422, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.5 }),
    lime: new MeshPhysicalMaterial({ color: LIME, roughness: 0.32, clearcoat: 0.6, emissive: 0x2c4200, emissiveIntensity: 0.25 }),
    ceramic: new MeshPhysicalMaterial({ color: 0xd9d5cc, roughness: 0.3, clearcoat: 0.8 }),
    cream: new MeshPhysicalMaterial({ color: 0xd8c99c, roughness: 0.6 }),
    sage: new MeshPhysicalMaterial({ color: 0x5f7a4c, roughness: 0.6 }),
    glass: new MeshPhysicalMaterial({ color: 0x101413, metalness: 0.2, roughness: 0.06, clearcoat: 1 }),
  };
}

type Materials = ReturnType<typeof materials>;

function mesh(geometry: BufferGeometry, material: Material, setup?: (m: Mesh) => void): Mesh {
  const m = new Mesh(geometry, material);
  setup?.(m);
  return m;
}

// Targets: a 3D calorie ring, 72% filled, starting at the top and running clockwise.
function ring(mat: Materials): Group {
  const group = new Group();
  const arc = Math.PI * 2 * 0.72;
  group.add(mesh(new TorusGeometry(1, 0.15, 32, 160), mat.rubber));
  group.add(mesh(new TorusGeometry(1, 0.19, 32, 160, arc), mat.lime, (m) => (m.rotation.z = Math.PI / 2 - arc)));
  // Chrome bead at the end of the filled arc.
  group.add(
    mesh(new CylinderGeometry(0.21, 0.21, 0.04, 32), mat.chrome, (m) => {
      const end = Math.PI / 2 - arc;
      m.position.set(Math.cos(end), Math.sin(end), 0);
      m.rotation.z = end;
    }),
  );
  group.rotation.x = -0.18;
  return group;
}

// Meals: a ceramic plate with four portions (protein, carbs, fat, fiber), one wedge per slot.
function plate(mat: Materials): Group {
  const group = new Group();
  const profile = [
    [0, 0],
    [1.2, 0],
    [1.32, 0.05],
    [1.46, 0.17],
    [1.42, 0.19],
    [1.27, 0.1],
    [0, 0.1],
  ].map(([x, y]) => new Vector2(x, y));
  group.add(mesh(new LatheGeometry(profile, 96), mat.ceramic));
  const portions: [Material, number][] = [
    [mat.lime, 0.36],
    [mat.cream, 0.44],
    [mat.rubber, 0.22],
    [mat.sage, 0.3],
  ];
  const gap = 0.07;
  const span = (Math.PI * 2) / portions.length;
  portions.forEach(([material, height], i) => {
    group.add(
      mesh(new CylinderGeometry(1.05, 1.05, height, 48, 1, false, i * span + gap / 2, span - gap), material, (m) => {
        m.position.y = 0.1 + height / 2;
        const middle = i * span + span / 2;
        // Pull each wedge out a little from the centre, so the four slots read as separate portions.
        m.position.x = Math.sin(middle) * 0.05;
        m.position.z = Math.cos(middle) * 0.05;
      }),
    );
  });
  group.rotation.x = 0.55;
  group.position.y = -0.15;
  return group;
}

// Workouts: a hex dumbbell in front and a kettlebell behind it.
function weights(mat: Materials): Group {
  const group = new Group();
  const dumbbell = new Group();
  dumbbell.add(mesh(new CylinderGeometry(0.07, 0.07, 1.2, 24), mat.chrome));
  for (const side of [-1, 1]) {
    dumbbell.add(mesh(new CylinderGeometry(0.11, 0.11, 0.08, 24), mat.chrome, (m) => (m.position.y = side * 0.56)));
    dumbbell.add(mesh(new CylinderGeometry(0.36, 0.36, 0.44, 6), mat.rubber, (m) => (m.position.y = side * 0.82)));
    dumbbell.add(mesh(new CylinderGeometry(0.365, 0.365, 0.05, 6), mat.lime, (m) => (m.position.y = side * 0.64)));
    dumbbell.add(mesh(new CylinderGeometry(0.2, 0.2, 0.03, 32), mat.chrome, (m) => (m.position.y = side * 1.045)));
  }
  dumbbell.rotation.z = Math.PI / 2;
  dumbbell.rotation.y = 0.35;
  dumbbell.position.set(-0.25, -0.55, 0.45);

  const kettlebell = new Group();
  const body = [
    [0, -0.55],
    [0.3, -0.55],
    [0.5, -0.42],
    [0.6, -0.16],
    [0.57, 0.1],
    [0.44, 0.3],
    [0.22, 0.42],
    [0, 0.44],
  ].map(([x, y]) => new Vector2(x, y));
  kettlebell.add(mesh(new LatheGeometry(body, 64), mat.rubber));
  kettlebell.add(mesh(new TorusGeometry(0.6, 0.022, 12, 96), mat.lime, (m) => {
    m.rotation.x = Math.PI / 2;
    m.position.y = -0.14;
  }));
  kettlebell.add(mesh(new TorusGeometry(0.34, 0.075, 20, 64, Math.PI), mat.rubber, (m) => (m.position.y = 0.52)));
  for (const side of [-1, 1]) {
    kettlebell.add(mesh(new CylinderGeometry(0.075, 0.075, 0.18, 20), mat.rubber, (m) => m.position.set(side * 0.34, 0.45, 0)));
  }
  kettlebell.position.set(0.75, 0.15, -0.55);
  kettlebell.rotation.y = -0.5;
  kettlebell.scale.setScalar(0.95);

  group.add(dumbbell, kettlebell);
  return group;
}

// The scale's display: the 7-day average in lime digits with a small trend line, drawn once.
function displayTexture(readout: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0b0e0d";
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = "#affa00";
  ctx.font = "700 112px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(readout.replace(" kg", ""), 236, 112);
  ctx.font = "600 40px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("kg", 440, 132);
  ctx.strokeStyle = "rgba(175, 250, 0, 0.7)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  [210, 214, 206, 210, 200, 204, 196].forEach((y, i) => (i === 0 ? ctx.moveTo(150 + i * 36, y) : ctx.lineTo(150 + i * 36, y)));
  ctx.stroke();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

// Progress: a smart scale with a glass top, chrome electrodes and the readout.
function scale(mat: Materials, readout: string, textures: CanvasTexture[]): Group {
  const group = new Group();
  group.add(mesh(new RoundedBoxGeometry(2.3, 0.1, 2.3, 4, 0.05), mat.rubber, (m) => (m.position.y = -0.05)));
  group.add(mesh(new RoundedBoxGeometry(2.2, 0.12, 2.2, 6, 0.06), mat.glass, (m) => (m.position.y = 0.06)));
  for (const side of [-1, 1]) {
    group.add(mesh(new RoundedBoxGeometry(0.5, 0.012, 0.75, 4, 0.006), mat.chrome, (m) => m.position.set(side * 0.55, 0.125, 0.3)));
  }
  const texture = displayTexture(readout);
  textures.push(texture);
  group.add(
    mesh(new PlaneGeometry(1.0, 0.5), new MeshBasicMaterial({ map: texture, toneMapped: false }), (m) => {
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, 0.127, -0.55);
    }),
  );
  group.rotation.x = 0.62;
  group.position.y = -0.1;
  return group;
}

// Adjust: three chrome slider rails with knobs, the middle one in lime.
function sliders(mat: Materials): Group {
  const group = new Group();
  group.add(mesh(new RoundedBoxGeometry(2.3, 0.14, 1.7, 6, 0.07), mat.rubber));
  [
    [-0.5, -0.45, mat.rubber],
    [0, 0.35, mat.lime],
    [0.5, -0.1, mat.rubber],
  ].forEach(([z, x, knob]) => {
    group.add(mesh(new CylinderGeometry(0.035, 0.035, 1.8, 16), mat.chrome, (m) => {
      m.rotation.z = Math.PI / 2;
      m.position.set(0, 0.1, z as number);
    }));
    group.add(mesh(new CylinderGeometry(0.17, 0.17, 0.2, 40), knob as Material, (m) => m.position.set(x as number, 0.2, z as number)));
    group.add(mesh(new CylinderGeometry(0.12, 0.12, 0.012, 40), mat.chrome, (m) => m.position.set(x as number, 0.307, z as number)));
  });
  group.rotation.x = 0.7;
  group.position.y = -0.1;
  return group;
}

function contactShadow(): Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0.55)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const shadow = mesh(
    new PlaneGeometry(3.6, 3.6),
    new MeshBasicMaterial({ map: new CanvasTexture(canvas), transparent: true, depthWrite: false }),
    (m) => {
      m.rotation.x = -Math.PI / 2;
      m.position.y = -1.15;
    },
  );
  return shadow;
}

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

export type ShowcaseHandle = { stop: () => void; setVisible: (visible: boolean) => void };

type Options = {
  objects: readonly ShowcaseObject[];
  scaleReadout: string;
  lite: boolean;
  getActive: () => number;
  // The 2D canvas to show the picture in: the pinned panel on desktop, or the active stage's slot on phones.
  getTarget: () => HTMLCanvasElement | null;
  onReady: () => void;
  onLost: () => void;
};

// One WebGL renderer draws offscreen, and each frame is copied into the current target canvas. So the
// object can move from one stage's slot to the next without a second WebGL context.
export function startShowcase({ objects, scaleReadout, lite, getActive, getTarget, onReady, onLost }: Options): ShowcaseHandle {
  const canvas = document.createElement("canvas");
  const pixelRatio = Math.min(window.devicePixelRatio, lite ? 1.25 : 1.75);
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.55;

  const key = new DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 5, 5);
  const rim = new DirectionalLight(new Color(LIME), 3.2);
  rim.position.set(-4, 2.5, -3);
  const fill = new DirectionalLight(0xbfd0c8, 0.4);
  fill.position.set(-3, -1, 4);
  scene.add(key, rim, fill, contactShadow());

  const camera = new PerspectiveCamera(30, 1, 0.1, 50);

  const mat = materials();
  const textures: CanvasTexture[] = [];
  const builders: Record<ShowcaseObject, () => Group> = {
    ring: () => ring(mat),
    plate: () => plate(mat),
    weights: () => weights(mat),
    scale: () => scale(mat, scaleReadout, textures),
    sliders: () => sliders(mat),
  };
  // Each object sits in a holder that the animation scales and turns, so the model keeps its own pose.
  const holders = objects.map((name) => {
    const holder = new Group();
    holder.add(builders[name]());
    holder.visible = false;
    scene.add(holder);
    return holder;
  });

  // Match the renderer to the target's size. A narrow (tall) target gets the camera further back,
  // so wide objects like the plate stay in frame.
  let sizeKey = "";
  const fit = (target: HTMLCanvasElement): boolean => {
    const width = target.clientWidth;
    const height = target.clientHeight;
    if (width === 0 || height === 0) return false;
    const key = `${width}x${height}`;
    if (key !== sizeKey) {
      sizeKey = key;
      renderer.setSize(width, height, false);
      target.width = Math.round(width * pixelRatio);
      target.height = Math.round(height * pixelRatio);
      camera.aspect = width / height;
      camera.position.set(0, 0.65, camera.aspect < 0.9 ? 7.6 : 6.5);
      camera.lookAt(0, -0.1, 0);
      camera.updateProjectionMatrix();
    }
    return true;
  };
  let lastTarget: HTMLCanvasElement | null = null;

  const handleLost = (event: Event) => {
    event.preventDefault();
    onLost();
  };
  canvas.addEventListener("webglcontextlost", handleLost);

  // Swap: the shown object shrinks and turns away, then the next grows in (0.35 s out, 0.6 s in).
  let shown = getActive();
  let leaving: number | null = null;
  let phaseStart = performance.now();
  holders[shown].visible = true;
  let frame = 0;
  let running = false;
  let ready = false;
  let visible = true;
  const start = performance.now();

  const draw = (now: number) => {
    frame = requestAnimationFrame(draw);
    const time = (now - start) / 1000;
    const wanted = getActive();
    if (leaving === null && wanted !== shown) {
      leaving = shown;
      shown = wanted;
      phaseStart = now;
    }
    const elapsed = (now - phaseStart) / 1000;
    holders.forEach((holder, i) => {
      if (i === leaving) {
        const k = Math.min(elapsed / 0.35, 1);
        holder.visible = k < 1;
        holder.scale.setScalar(Math.max(1 - easeOut(k), 0.001));
        holder.rotation.y += 0.08;
        if (k >= 1) {
          leaving = null;
          phaseStart = now;
        }
      } else if (i === shown && leaving === null) {
        const k = easeOut(Math.min(elapsed / 0.6, 1));
        holder.visible = true;
        holder.scale.setScalar(0.001 + k * 0.999);
        // A slow turntable sway with a gentle float, the same for every object.
        holder.rotation.y = (1 - k) * -0.9 + Math.sin(time * 0.45) * 0.45;
        holder.position.y = Math.sin(time * 0.9) * 0.05;
      } else if (i !== shown) {
        holder.visible = false;
      }
    });
    const target = getTarget();
    if (!target || !fit(target)) return;
    if (target !== lastTarget) {
      lastTarget = target;
      sizeKey = "";
      fit(target);
    }
    renderer.render(scene, camera);
    const context = target.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, target.width, target.height);
    context.drawImage(canvas, 0, 0, target.width, target.height);
    if (!ready) {
      ready = true;
      onReady();
    }
  };

  const play = () => {
    if (running || !visible || document.visibilityState !== "visible") return;
    running = true;
    frame = requestAnimationFrame(draw);
  };
  const pause = () => {
    cancelAnimationFrame(frame);
    running = false;
  };
  const onVisibility = () => (document.visibilityState === "visible" ? play() : pause());
  document.addEventListener("visibilitychange", onVisibility);
  play();

  return {
    // Off screen or in a background tab nothing is drawn, to save battery. This is not a user pause.
    setVisible: (next) => {
      visible = next;
      if (next) play();
      else pause();
    },
    stop: () => {
      pause();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", handleLost);
      scene.traverse((object: Object3D) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          const material = object.material as Material & { map?: { dispose: () => void } | null };
          material.map?.dispose();
        }
      });
      Object.values(mat).forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
