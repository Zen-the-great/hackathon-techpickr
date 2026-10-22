import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useTranslation } from "react-i18next";
import "./PcModel.css";

const MINT = 0x34d399;

// soft green glow used on the floor under the PC
function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(52, 211, 153, 0.55)");
  grad.addColorStop(0.45, "rgba(52, 211, 153, 0.14)");
  grad.addColorStop(1, "rgba(52, 211, 153, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

// builds the whole PC and returns it, plus the list of spinning fans
function buildPc(mats) {
  const pc = new THREE.Group();
  const rotors = [];

  const add = (parent, geometry, material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  // a fan that faces +z. rotate the returned group to point it somewhere else
  const makeFan = (radius) => {
    const fan = new THREE.Group();
    add(fan, new THREE.TorusGeometry(radius, 0.016, 12, 56), mats.mint);
    add(fan, new THREE.RingGeometry(radius + 0.01, radius + 0.07, 56), mats.dark);

    const rotor = new THREE.Group();
    const hub = add(rotor, new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, 0.05, 28), mats.darker);
    hub.rotation.x = Math.PI / 2;
    const blades = 9;
    for (let i = 0; i < blades; i++) {
      const pivot = new THREE.Group();
      pivot.rotation.z = (i / blades) * Math.PI * 2;
      const length = radius * 0.72;
      const blade = add(pivot, box(length, radius * 0.24, 0.01), mats.blade, radius * 0.22 + length / 2, 0, 0);
      blade.rotation.x = 0.55;
      rotor.add(pivot);
    }
    fan.add(rotor);
    rotors.push(rotor);
    return fan;
  };

  const W = 1.7; // width  (x)
  const H = 3.4; // height (y)
  const D = 3.2; // depth  (z)

  // ----- case shell -----
  add(pc, box(0.05, H, D), mats.darker, -W / 2, 0, 0);          // motherboard tray (left wall)
  add(pc, box(W, 0.06, D), mats.dark, 0, -H / 2, 0);            // bottom
  add(pc, box(W, 0.06, D), mats.dark, 0, H / 2, 0);             // top
  add(pc, box(W, H, 0.04), mats.darker, 0, 0, -D / 2);          // back
  for (const x of [-W / 2, W / 2]) {
    add(pc, box(0.07, H, 0.07), mats.dark, x, 0, D / 2);        // front pillars
  }
  add(pc, box(0.012, H - 0.1, D - 0.1), mats.glass, W / 2, 0, 0); // glass side panel
  add(pc, box(W, 0.012, 0.012), mats.mint, 0, H / 2 + 0.035, D / 2 - 0.02); // mint line on top front

  // ----- motherboard -----
  add(pc, box(0.04, 2.5, 2.2), mats.board, -0.8, 0.15, -0.25);
  add(pc, box(0.006, 0.02, 1.5), mats.mintDim, -0.775, -0.5, -0.2);
  add(pc, box(0.006, 0.02, 1.1), mats.mintDim, -0.775, -0.7, -0.4);
  add(pc, box(0.006, 1.2, 0.02), mats.mintDim, -0.775, 0.1, 0.75);
  add(pc, box(0.18, 0.5, 0.7), mats.dark, -0.7, 1.2, -0.75);   // VRM heatsink

  // ----- CPU air cooler (aluminium fins + fan) -----
  for (let i = 0; i < 20; i++) {
    add(pc, box(0.62, 0.9, 0.012), mats.metal, -0.47, 0.85, -0.56 + i * 0.026);
  }
  add(pc, box(0.64, 0.03, 0.52), mats.dark, -0.47, 1.32, -0.3);
  add(pc, box(0.64, 0.012, 0.5), mats.mint, -0.47, 1.345, -0.3);
  const cpuFan = makeFan(0.3);
  cpuFan.position.set(-0.47, 0.85, 0.0);
  pc.add(cpuFan);

  // ----- RAM sticks with glowing tops -----
  for (let i = 0; i < 4; i++) {
    const z = 0.38 + i * 0.1;
    add(pc, box(0.42, 0.78, 0.035), mats.ram, -0.57, 1.0, z);
    add(pc, box(0.43, 0.05, 0.038), mats.mint, -0.57, 1.4, z);
  }

  // ----- graphics card, mounted vertically so the fans face the glass -----
  const gx = 0.25;
  const gy = -0.4;
  add(pc, box(0.34, 0.8, 1.95), mats.dark, gx, gy, 0.1);
  add(pc, box(0.36, 0.02, 1.95), mats.mint, gx, gy + 0.41, 0.1);
  add(pc, box(0.36, 0.02, 1.95), mats.mintDim, gx, gy - 0.41, 0.1);
  for (const z of [-0.6, 0.1, 0.8]) {
    const fan = makeFan(0.27);
    fan.rotation.y = Math.PI / 2;
    fan.position.set(gx + 0.175, gy, z);
    pc.add(fan);
  }

  // ----- power supply cover -----
  add(pc, box(1.6, 0.5, 3.0), mats.darker, 0, -1.42, 0);
  add(pc, box(0.012, 0.03, 2.9), mats.mint, W / 2 - 0.02, -1.2, 0);

  // ----- front intake fans -----
  for (const y of [1.05, 0.2, -0.65]) {
    const fan = makeFan(0.42);
    fan.position.set(0, y, D / 2 - 0.12);
    pc.add(fan);
  }

  // ----- cables -----
  const cable = (points, radius, material) => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    add(pc, new THREE.TubeGeometry(curve, 48, radius, 8, false), material);
  };
  cable([[-0.72, -1.15, 0.9], [-0.74, -0.5, 1.0], [-0.74, 0.3, 1.0], [-0.72, 1.0, 0.92]], 0.035, mats.cable);
  cable([[-0.4, -1.15, 0.2], [-0.5, -0.9, 0.1], [-0.62, -0.5, -0.1], [-0.7, 0.1, -0.4]], 0.02, mats.mint);

  return { pc, rotors, height: H };
}

function PcModel() {
  const { t } = useTranslation();
  const mountRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (error) {
      console.error("Unable to initialize the PC model renderer:", error);
      queueMicrotask(() => setFailed(true));
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // reflections for the metal parts
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    if ("environmentIntensity" in scene) scene.environmentIntensity = 0.35;

    // ----- lights (change these numbers if the PC looks too dark or too bright) -----
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 6, 5);
    scene.add(key);
    const mintLight = new THREE.PointLight(MINT, 28, 7);
    mintLight.position.set(0.3, -0.2, 0.2);
    scene.add(mintLight);
    const topLight = new THREE.PointLight(MINT, 14, 6);
    topLight.position.set(-0.3, 1.2, 0.5);
    scene.add(topLight);
    const rim = new THREE.PointLight(0x2dd4bf, 20, 12);
    rim.position.set(-4, 2, -4);
    scene.add(rim);

    // ----- materials -----
    const mint = new THREE.MeshStandardMaterial({ color: MINT, emissive: MINT, emissiveIntensity: 1.6, roughness: 0.4 });
    const mats = {
      mint,
      mintDim: new THREE.MeshStandardMaterial({ color: MINT, emissive: MINT, emissiveIntensity: 0.5, roughness: 0.6 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x1a1d20, roughness: 0.5, metalness: 0.65 }),
      darker: new THREE.MeshStandardMaterial({ color: 0x0d0f11, roughness: 0.65, metalness: 0.5 }),
      board: new THREE.MeshStandardMaterial({ color: 0x0b1713, roughness: 0.6, metalness: 0.3 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x8c949a, roughness: 0.35, metalness: 0.9 }),
      ram: new THREE.MeshStandardMaterial({ color: 0x23282c, roughness: 0.45, metalness: 0.6 }),
      blade: new THREE.MeshStandardMaterial({ color: 0x2b3035, roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide }),
      cable: new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.8, metalness: 0.1 }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x9fe8cf,
        transparent: true,
        opacity: 0.07,
        roughness: 0.05,
        metalness: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    };

    const { pc, rotors, height } = buildPc(mats);
    const stage = new THREE.Group();
    stage.add(pc);
    scene.add(stage);

    // glow on the floor
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 64),
      new THREE.MeshBasicMaterial({
        map: makeGlowTexture(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -height / 2 - 0.04;
    scene.add(glow);

    const floorRing = new THREE.Mesh(
      new THREE.RingGeometry(2.05, 2.09, 96),
      new THREE.MeshBasicMaterial({ color: MINT, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = -height / 2 - 0.035;
    scene.add(floorRing);

    // ----- camera and controls -----
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(6.4, 1.8, 7.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 1.1;
    controls.minPolarAngle = Math.PI / 3;
    controls.maxPolarAngle = Math.PI / 1.85;
    controls.target.set(0, 0, 0);
    renderer.domElement.style.touchAction = "pan-y"; // lets phones still scroll the page

    // ----- size -----
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    // do not draw while the PC is off-screen
    let visible = true;
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    visibility.observe(mount);

    // ----- animation -----
    let last = performance.now();
    renderer.setAnimationLoop((now) => {
      if (!visible) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = now / 1000;

      if (!reduceMotion) {
        rotors.forEach((rotor) => {
          rotor.rotation.z -= dt * 6;
        });
        stage.position.y = Math.sin(t * 0.9) * 0.06;
        mint.emissiveIntensity = 1.35 + Math.sin(t * 2) * 0.35;
      }
      controls.update();
      renderer.render(scene, camera);
    });

    // ----- clean up when the page changes -----
    return () => {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      visibility.disconnect();
      controls.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const list = Array.isArray(obj.material) ? obj.material : [obj.material];
          list.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="pc-stage" ref={mountRef} aria-label={t("pc.modelLabel")}>
      {failed && <p className="pc-fallback">{t("pc.fallback")}</p>}
      <span className="pc-hint">{t("pc.drag")}</span>
    </div>
  );
}

export default PcModel;
