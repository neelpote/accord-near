"use client";
import { useEffect, useRef, useState } from "react";
export default function AgentScene({
  active,
  paused,
  progress = 0,
}: {
  active: number;
  paused: boolean;
  progress?: number;
}) {
  const host = useRef<HTMLDivElement>(null),
    state = useRef({ active, paused, progress });
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    state.current = { active, paused, progress };
  }, [active, paused, progress]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const container = element;
    let disposed = false,
      cleanup = () => {};
    async function start() {
      const [T, { GLTFLoader }] = await Promise.all([
        import("three"),
        import("three/addons/loaders/GLTFLoader.js"),
      ]);
      if (disposed) return;
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try {
        renderer = new T.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
      } catch {
        setStatus("fallback");
        return;
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.domElement.setAttribute("aria-hidden", "true");
      container.appendChild(renderer.domElement);
      const scene = new T.Scene(),
        camera = new T.PerspectiveCamera(32, 1, 0.1, 80);
      camera.position.set(3.5, 3.2, 9.5);
      camera.lookAt(0, 2, 0);
      const geometries = new Set<InstanceType<typeof T.BufferGeometry>>(),
        materials = new Set<InstanceType<typeof T.Material>>();
      let frame = 0;
      cleanup = () => {
        cancelAnimationFrame(frame);
        scene.traverse((o) => {
          if (o instanceof T.Mesh) {
            geometries.add(o.geometry);
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(
              (m) => materials.add(m),
            );
          }
        });
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
      scene.add(new T.HemisphereLight("#ffffff", "#6b6056", 2.8));
      const key = new T.DirectionalLight("#fff1dd", 4);
      key.position.set(3, 7, 6);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -4;
      key.shadow.camera.right = 4;
      key.shadow.camera.top = 6;
      key.shadow.camera.bottom = -3;
      key.shadow.normalBias = 0.03;
      scene.add(key);
      const rim = new T.DirectionalLight("#e77f42", 2);
      rim.position.set(-5, 3, -4);
      scene.add(rim);
      const ground = new T.Mesh(
        new T.PlaneGeometry(30, 30),
        new T.ShadowMaterial({ opacity: 0.16 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      ground.position.y = -0.02;
      scene.add(ground);
      const ring = new T.Mesh(
        new T.RingGeometry(1.35, 1.37, 80),
        new T.MeshBasicMaterial({
          color: "#d85725",
          transparent: true,
          opacity: 0.5,
          side: T.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.015;
      scene.add(ring);
      const loader = new GLTFLoader();
      const asset = await loader.loadAsync("/models/robot-expressive.glb");
      if (disposed) {
        asset.scene.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.geometry.dispose();
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(
              (m) => m.dispose(),
            );
          }
        });
        return;
      }
      const model = asset.scene;
      const bounds = new T.Box3().setFromObject(model),
        size = bounds.getSize(new T.Vector3());
      model.scale.setScalar(4.25 / size.y);
      const scaled = new T.Box3().setFromObject(model);
      model.position.y -= scaled.min.y;
      const center = scaled.getCenter(new T.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(
            (m) => {
              if (m instanceof T.MeshStandardMaterial) {
                if (m.name === "Main") {
                  m.color.set("#e6622e");
                  m.metalness = 0.28;
                  m.roughness = 0.42;
                } else if (m.name === "Grey") {
                  m.color.set("#a9aaa2");
                  m.metalness = 0.48;
                  m.roughness = 0.36;
                } else {
                  m.color.set("#252822");
                  m.metalness = 0.22;
                  m.roughness = 0.4;
                }
              }
            },
          );
        }
      });
      const rig = new T.Group();
      rig.add(model);
      scene.add(rig);
      const mixer = new T.AnimationMixer(model),
        idle = asset.animations.find((c) => c.name === "Idle");
      if (idle) mixer.clipAction(idle).play();
      let visible = true,
        lost = false,
        last = 0,
        time = 0,
        wasStill = false,
        lastProgress = -1,
        lastActive = -1;
      const preference = matchMedia("(prefers-reduced-motion: reduce)");
      const resize = () => {
        const w = container.clientWidth,
          h = container.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      resize();
      const intersection = new IntersectionObserver(([e]) => {
        visible = !!e?.isIntersecting;
      });
      intersection.observe(container);
      const lostContext = (e: Event) => {
        e.preventDefault();
        lost = true;
        setStatus("fallback");
      };
      renderer.domElement.addEventListener("webglcontextlost", lostContext);
      const baseCleanup = cleanup;
      cleanup = () => {
        resizeObserver.disconnect();
        intersection.disconnect();
        mixer.stopAllAction();
        mixer.uncacheRoot(model);
        renderer.domElement.removeEventListener(
          "webglcontextlost",
          lostContext,
        );
        baseCleanup();
      };
      function draw(now: number) {
        if (disposed || lost) return;
        frame = requestAnimationFrame(draw);
        const delta = Math.min((now - last) / 1000, 0.04);
        last = now;
        const s = state.current;
        const still =
          s.paused || preference.matches || document.hidden || !visible;
        if (
          still &&
          wasStill &&
          lastProgress === s.progress &&
          lastActive === s.active
        )
          return;
        wasStill = still;
        lastProgress = s.progress;
        lastActive = s.active;
        if (!still) {
          time += delta;
          mixer.update(delta * 0.55);
        }
        const p = preference.matches || s.paused ? 0 : s.progress;
        rig.rotation.y = T.MathUtils.lerp(
          rig.rotation.y,
          -0.22 + p * 1.08,
          0.085,
        );
        camera.position.set(
          3.5 - p * 5.4,
          3.15 + Math.sin(p * Math.PI) * 0.65,
          9.6 - p * 1.2,
        );
        camera.lookAt(0, 2.05 + p * 0.3, 0);
        ring.scale.setScalar(1 + Math.sin(p * Math.PI) * 0.25);
        (ring.material as InstanceType<typeof T.MeshBasicMaterial>).opacity =
          0.35 + p * 0.35;
        // The character's actual authored idle clip stays restrained. The camera and evidence plane scrub with native scroll.
        renderer.render(scene, camera);
      }
      frame = requestAnimationFrame(draw);
      setStatus("ready");
    }
    void start().catch(() => {
      cleanup();
      if (!disposed) setStatus("fallback");
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  return (
    <div
      className={`agent-scene ${status === "ready" ? "is-ready" : ""}`}
      data-scene-state={status}
      ref={host}
    >
      <div className="model-fallback" aria-hidden="true">
        <span>ACCORD</span>
        <svg viewBox="0 0 240 300">
          <path
            d="M70 75V35h100v40l-22 20H92Z M85 108h70l22 80h-30v75h-22v-66h-10v66H93v-75H63Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path d="M93 55h54M104 124h32" stroke="#d85725" strokeWidth="8" />
        </svg>
        <small>OBSERVE / VERIFY / LIMIT</small>
      </div>
    </div>
  );
}
