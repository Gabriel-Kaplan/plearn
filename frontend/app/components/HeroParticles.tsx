"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Particles() {
  const ref = useRef<THREE.Points>(null!);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const COUNT = 936; // One particle per plant in the database
    const positions = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 5 + Math.random() * 8;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      positions[i * 3 + 2] = r * Math.cos(phi) - 2;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * 0.011;
    ref.current.rotation.x = Math.sin(t * 0.007) * 0.045;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.065}
        color={new THREE.Color("#5A9A68")}
        transparent
        opacity={0.38}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export default function HeroParticles() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 55 }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true }}
    >
      <Particles />
    </Canvas>
  );
}
