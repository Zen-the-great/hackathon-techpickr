import { useEffect, useRef } from "react";
import * as THREE from "three";
import "./HeroBackground.css";

function HeroBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Scene, camera, renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const shapeColor = 0x4f46e5; // indigo
    const group = new THREE.Group();
    scene.add(group);

    // Outer wireframe shape
    const outerGeo = new THREE.IcosahedronGeometry(2.6, 1);
    const outerWire = new THREE.WireframeGeometry(outerGeo);
    const outerMat = new THREE.LineBasicMaterial({
      color: shapeColor,
      transparent: true,
      opacity: 0.55,
    });
    const outer = new THREE.LineSegments(outerWire, outerMat);
    group.add(outer);

    // Inner shape
    const innerGeo = new THREE.OctahedronGeometry(1.2, 0);
    const innerWire = new THREE.WireframeGeometry(innerGeo);
    const innerMat = new THREE.LineBasicMaterial({
      color: shapeColor,
      transparent: true,
      opacity: 0.95,
    });
    const inner = new THREE.LineSegments(innerWire, innerMat);
    group.add(inner);

    // Thin orbit ring
    const ringGeo = new THREE.TorusGeometry(3.7, 0.008, 8, 160);
    const ringMat = new THREE.MeshBasicMaterial({
      color: shapeColor,
      transparent: true,
      opacity: 0.4,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.4;
    group.add(ring);

    // Floating dots
    const count = 220;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 4 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const dotsGeo = new THREE.BufferGeometry();
    dotsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const dotsMat = new THREE.PointsMaterial({
      color: 0x94a3b8, // slate grey
      size: 0.035,
      transparent: true,
      opacity: 0.7,
    });
    const dots = new THREE.Points(dotsGeo, dotsMat);
    scene.add(dots);

    // Mouse movement (very subtle)
    const pointer = { x: 0, y: 0 };
    const onPointerMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove);

    // Fit to container and position the object
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      const visibleHeight =
        2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const visibleWidth = visibleHeight * camera.aspect;

      if (camera.aspect > 1.2) {
        group.position.set(visibleWidth * 0.24, 0, 0);
        group.scale.setScalar(1);
      } else {
        group.position.set(0, 0, 0);
        group.scale.setScalar(0.75);
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    // Animation
    let frameId;
    const timer = new THREE.Timer();
    timer.connect(document);

    const render = (timestamp) => {
      timer.update(timestamp);
      const t = timer.getElapsed();
      outer.rotation.y = t * 0.12;
      outer.rotation.x = t * 0.06;
      inner.rotation.y = -t * 0.2;
      inner.rotation.z = t * 0.1;
      ring.rotation.z = t * 0.08;
      dots.rotation.y = t * 0.02;

      group.rotation.y += (pointer.x * 0.25 - group.rotation.y) * 0.03;
      group.rotation.x += (pointer.y * 0.15 - group.rotation.x) * 0.03;

      renderer.render(scene, camera);
      if (!reduceMotion) frameId = requestAnimationFrame(render);
    };
    render(performance.now());

    // Cleanup when the component is removed
    return () => {
      cancelAnimationFrame(frameId);
      timer.dispose();
      window.removeEventListener("pointermove", onPointerMove);
      observer.disconnect();
      [outerGeo, outerWire, innerGeo, innerWire, ringGeo, dotsGeo].forEach(
        (g) => g.dispose()
      );
      [outerMat, innerMat, ringMat, dotsMat].forEach((m) => m.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div className="hero-bg" ref={mountRef} aria-hidden="true" />;
}

export default HeroBackground;