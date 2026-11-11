"use client";
import { useEffect, useRef, useState } from "react";
export default function AgentScene({
  active,
  paused,
}: {
  active: number;
  paused: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    selected = useRef(active),
    motionPaused = useRef(paused);
  const [ready, setReady] = useState(false),
    [unsupported, setUnsupported] = useState(false);
  useEffect(() => {
    selected.current = active;
  }, [active]);
  useEffect(() => {
    motionPaused.current = paused;
  }, [paused]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const container = element;
    let disposed = false,
      cleanup = () => {};
    async function start() {
      const [T, { RoundedBoxGeometry }, { RoomEnvironment }] =
        await Promise.all([
          import("three"),
          import("three/addons/geometries/RoundedBoxGeometry.js"),
          import("three/addons/environments/RoomEnvironment.js"),
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
        setUnsupported(true);
        return;
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.domElement.setAttribute("aria-hidden", "true");
      container.appendChild(renderer.domElement);
      const scene = new T.Scene();
      const pmrem = new T.PMREMGenerator(renderer),
        room = new RoomEnvironment(),
        environment = pmrem.fromScene(room, 0.04);
      scene.environment = environment.texture;
      room.dispose();
      pmrem.dispose();
      const camera = new T.OrthographicCamera(-4, 4, 3.5, -3.5, 0.1, 100);
      camera.position.set(7, 5.5, 8);
      camera.lookAt(0, 0.8, 0);
      const root = new T.Group();
      scene.add(root);
      const material = (color: string, metalness = 0.1, roughness = 0.5) =>
        new T.MeshStandardMaterial({ color, metalness, roughness });
      const ivory = material("#f6f0e5", 0.28, 0.3),
        edge = material("#b8b6b0", 0.7, 0.28),
        dark = material("#202726", 0.4, 0.3),
        face = material("#101c20", 0.25, 0.2),
        orange = material("#f0662c", 0.3, 0.35);
      const glow = new T.MeshStandardMaterial({
        color: "#c9f8ec",
        emissive: "#a5e9dc",
        emissiveIntensity: 1.5,
      });
      const accent = new T.MeshStandardMaterial({
        color: "#ff8149",
        emissive: "#ff5b10",
        emissiveIntensity: 0.7,
      });
      function box(
        w: number,
        h: number,
        d: number,
        r: number,
        mat: InstanceType<typeof T.Material>,
        parent: InstanceType<typeof T.Object3D>,
        x = 0,
        y = 0,
        z = 0,
      ) {
        const m = new T.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        parent.add(m);
        return m;
      }
      function sphere(
        r: number,
        mat: InstanceType<typeof T.Material>,
        parent: InstanceType<typeof T.Object3D>,
        x: number,
        y: number,
        z: number,
      ) {
        const m = new T.Mesh(new T.SphereGeometry(r, 16, 12), mat);
        m.position.set(x, y, z);
        parent.add(m);
        return m;
      }
      scene.add(new T.HemisphereLight("#fff8eb", "#6c625a", 1.8));
      const sun = new T.DirectionalLight("#fff0df", 3);
      sun.position.set(-3, 8, 5);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -5;
      sun.shadow.camera.right = 5;
      sun.shadow.camera.top = 5;
      sun.shadow.camera.bottom = -5;
      sun.shadow.normalBias = 0.04;
      scene.add(sun);
      const rim = new T.PointLight("#ff7a35", 35, 12);
      rim.position.set(1, 1, -2);
      scene.add(rim);
      box(
        5.6,
        0.22,
        4.3,
        0.13,
        material("#d4c6b3", 0.6, 0.3),
        root,
        0,
        -0.22,
        0,
      );
      box(5.7, 0.04, 4.35, 0.1, orange, root, 0, -0.34, 0);
      // A manufactured work surface, inspired by the references; this is illustrative, never live telemetry.
      for (let i = 0; i < 7; i++)
        for (let j = 0; j < 5; j++) {
          box(
            0.76,
            0.045,
            0.79,
            0.035,
            material((i + j) % 2 ? "#ede5d8" : "#e6ded0", 0.35, 0.45),
            root,
            -2.4 + i * 0.8,
            -0.075,
            -1.65 + j * 0.82,
          );
        }
      for (const z of [-2.02, 2.02])
        box(5.1, 0.028, 0.035, 0.01, accent, root, 0, -0.01, z);
      const bolts = new T.InstancedMesh(
        new T.CylinderGeometry(0.025, 0.025, 0.02, 8),
        edge,
        56,
      );
      const dummy = new T.Object3D();
      for (let i = 0; i < 56; i++) {
        dummy.position.set(
          -2.5 + (i % 14) * 0.385,
          -0.035,
          Math.floor(i / 14) % 2 ? 1.88 : -1.88,
        );
        dummy.updateMatrix();
        bolts.setMatrixAt(i, dummy.matrix);
      }
      root.add(bolts);
      const positions = [
        [-1.5, -1.1],
        [0.1, -1.45],
        [0.1, 0.95],
        [1.6, -0.25],
        [-1.55, 0.85],
      ];
      const robots: {
        group: InstanceType<typeof T.Group>;
        head: InstanceType<typeof T.Group>;
        eyes: InstanceType<typeof T.Mesh>[];
        arm: InstanceType<typeof T.Group>;
        ring: InstanceType<typeof T.Mesh>;
        y: number;
      }[] = [];
      positions.forEach(([x, z], index) => {
        const group = new T.Group();
        group.position.set(x!, 0, z!);
        group.rotation.y = 0.45;
        group.scale.setScalar(index === 2 ? 1.12 : 0.82);
        root.add(group);
        const ring = new T.Mesh(
          new T.TorusGeometry(0.49, 0.012, 8, 48),
          accent.clone(),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.012;
        group.add(ring);
        for (const side of [-1, 1]) {
          box(0.2, 0.12, 0.33, 0.05, dark, group, side * 0.16, 0.13, 0.05);
          box(0.12, 0.27, 0.14, 0.05, ivory, group, side * 0.16, 0.3, 0);
        }
        box(0.52, 0.55, 0.37, 0.13, ivory, group, 0, 0.68, 0);
        box(0.28, 0.05, 0.018, 0.01, edge, group, 0, 0.78, 0.19);
        sphere(0.045, orange, group, 0, 0.58, 0.19);
        box(0.18, 0.13, 0.18, 0.04, edge, group, 0, 0.98, 0);
        const head = new T.Group();
        head.position.y = 1.32;
        group.add(head);
        box(0.93, 0.71, 0.67, 0.15, ivory, head);
        box(0.79, 0.49, 0.055, 0.12, face, head, 0, 0, 0.335);
        const eyes: InstanceType<typeof T.Mesh>[] = [];
        for (const side of [-1, 1]) {
          const eye = sphere(0.075, glow, head, side * 0.18, 0.035, 0.375);
          eye.scale.set(0.65, 1.15, 0.25);
          eyes.push(eye);
        }
        const smile = new T.QuadraticBezierCurve3(
          new T.Vector3(-0.09, -0.1, 0.37),
          new T.Vector3(0, -0.18, 0.39),
          new T.Vector3(0.09, -0.1, 0.37),
        );
        head.add(
          new T.Mesh(new T.TubeGeometry(smile, 16, 0.012, 6, false), glow),
        );
        for (const side of [-1, 1]) {
          const ear = new T.Mesh(
            new T.CylinderGeometry(0.15, 0.15, 0.045, 32),
            edge,
          );
          ear.rotation.z = Math.PI / 2;
          ear.position.set(side * 0.475, 0, 0);
          head.add(ear);
          const halo = new T.Mesh(
            new T.TorusGeometry(0.11, 0.014, 8, 32),
            glow,
          );
          halo.rotation.y = Math.PI / 2;
          halo.position.set(side * 0.505, 0, 0);
          head.add(halo);
        }
        box(0.025, 0.15, 0.025, 0.01, edge, head, 0, 0.42, 0);
        sphere(0.045, index === 2 ? accent : glow, head, 0, 0.51, 0);
        for (const side of [-1, 1]) {
          const arm = new T.Group();
          arm.position.set(side * 0.33, 0.85, 0);
          group.add(arm);
          sphere(0.09, dark, arm, 0, 0, 0);
          box(0.12, 0.3, 0.15, 0.05, ivory, arm, side * 0.03, -0.17, 0);
          sphere(0.08, dark, arm, side * 0.03, -0.34, 0);
          if (side === 1)
            robots[index] = { group, head, eyes, arm, ring, y: 1.32 };
        }
      });
      // Moving signal beads follow the same physical track; selection changes the focused specialist.
      const route = new T.CatmullRomCurve3(
        [
          new T.Vector3(-2.5, 0.015, 1.9),
          new T.Vector3(2.5, 0.015, 1.9),
          new T.Vector3(2.5, 0.015, -1.9),
          new T.Vector3(-2.5, 0.015, -1.9),
        ],
        true,
        "centripetal",
        0.05,
      );
      const beads = Array.from({ length: 4 }, () =>
        sphere(0.04, accent, root, 0, 0, 0),
      );
      let lost = false,
        visible = true,
        frame = 0,
        last = 0,
        time = 0,
        pointerX = 0,
        pointerY = 0;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)");
      const resize = () => {
        const w = container.clientWidth,
          h = container.clientHeight;
        renderer.setSize(w, h);
        const aspect = w / h;
        const extent = 2.95;
        camera.left = -extent * aspect;
        camera.right = extent * aspect;
        camera.top = extent;
        camera.bottom = -extent;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(container);
      resize();
      const intersection = new IntersectionObserver(([entry]) => {
        visible = !!entry?.isIntersecting;
      });
      intersection.observe(container);
      const move = (e: PointerEvent) => {
        const r = container.getBoundingClientRect();
        pointerX = (e.clientX - r.left) / r.width - 0.5;
        pointerY = (e.clientY - r.top) / r.height - 0.5;
      };
      const leave = () => {
        pointerX = 0;
        pointerY = 0;
      };
      container.addEventListener("pointermove", move);
      container.addEventListener("pointerleave", leave);
      let wasPaused = false,
        lastSelected = -1;
      function draw(now: number) {
        if (disposed || lost) return;
        frame = requestAnimationFrame(draw);
        const delta = Math.min((now - last) / 1000, 0.05);
        last = now;
        const still =
          motionPaused.current ||
          reduced.matches ||
          document.hidden ||
          !visible;
        if (still && wasPaused && lastSelected === selected.current) return;
        wasPaused = still;
        lastSelected = selected.current;
        if (!still) time += delta;
        root.rotation.y += (pointerX * 0.12 - root.rotation.y) * 0.035;
        root.rotation.x += (-pointerY * 0.035 - root.rotation.x) * 0.035;
        robots.forEach((r, i) => {
          const focused = i === selected.current;
          r.head.rotation.y = Math.sin(time * 0.8 + i) * 0.1;
          r.head.rotation.z = Math.sin(time * 0.65 + i) * 0.035;
          r.head.position.y = r.y + Math.sin(time * 1.6 + i) * 0.018;
          r.arm.rotation.x = focused ? -0.35 + Math.sin(time * 2) * 0.15 : 0.06;
          r.arm.rotation.z = focused ? -0.3 : 0;
          const blink = Math.pow(
            Math.max(0, Math.sin(time * 0.65 + i * 1.3)),
            28,
          );
          r.eyes.forEach((e) => (e.scale.y = 1.15 - blink));
          (
            r.ring.material as InstanceType<typeof T.MeshStandardMaterial>
          ).emissiveIntensity = focused ? 1.8 : 0.08;
          r.ring.visible = focused;
        });
        beads.forEach((b, i) =>
          b.position.copy(route.getPointAt((time * 0.055 + i / 4) % 1)),
        );
        renderer.render(scene, camera);
      }
      frame = requestAnimationFrame(draw);
      setReady(true);
      const contextLost = (e: Event) => {
        e.preventDefault();
        lost = true;
        setUnsupported(true);
      };
      renderer.domElement.addEventListener("webglcontextlost", contextLost);
      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        intersection.disconnect();
        container.removeEventListener("pointermove", move);
        container.removeEventListener("pointerleave", leave);
        renderer.domElement.removeEventListener(
          "webglcontextlost",
          contextLost,
        );
        const geometries = new Set<InstanceType<typeof T.BufferGeometry>>(),
          materials = new Set<InstanceType<typeof T.Material>>();
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
        environment.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    }
    void start().catch(() => {
      if (!disposed) setUnsupported(true);
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  return (
    <div
      className={`agent-scene ${ready && !unsupported ? "is-ready" : ""}`}
      data-scene-state={unsupported ? "fallback" : ready ? "ready" : "loading"}
      ref={host}
    >
      <svg className="scene-fallback" viewBox="0 0 600 440" aria-hidden="true">
        <defs>
          <linearGradient id="fallback-body" x2="1" y2="1">
            <stop stopColor="#fff9ef" />
            <stop offset="1" stopColor="#bcb7ac" />
          </linearGradient>
        </defs>
        <path
          d="M45 310 305 180 565 310 305 430Z"
          fill="#d8c9b5"
          stroke="#f0723a"
          strokeWidth="3"
        />
        {[
          [-110, 20],
          [110, 0],
          [0, -65],
          [0, 75],
        ].map(([x, y], i) => (
          <g
            key={i}
            transform={`translate(${300 + x!} ${210 + y!}) scale(${i === 3 ? 1.1 : 0.75})`}
          >
            <rect
              x="-27"
              y="24"
              width="54"
              height="62"
              rx="18"
              fill="url(#fallback-body)"
            />
            <rect
              x="-57"
              y="-52"
              width="114"
              height="90"
              rx="24"
              fill="url(#fallback-body)"
            />
            <rect
              x="-47"
              y="-40"
              width="94"
              height="62"
              rx="17"
              fill="#17272a"
            />
            <ellipse cx="-20" cy="-13" rx="5" ry="9" fill="#bdede4" />
            <ellipse cx="20" cy="-13" rx="5" ry="9" fill="#bdede4" />
            <path
              d="M-10 4Q0 14 10 4"
              fill="none"
              stroke="#bdede4"
              strokeWidth="3"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
