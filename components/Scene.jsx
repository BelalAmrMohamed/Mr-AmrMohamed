"use client";
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTheme } from "./Theme";

// A globe of points (the "world of English") with an orbiting ring, easing toward the pointer.
function Globe({ dark }) {
  const group = useRef();
  const positions = useMemo(() => {
    const n = 2600, a = new Float32Array(n * 3), g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), t = g * i;
      a.set([Math.cos(t) * r * 2, y * 2, Math.sin(t) * r * 2], i * 3);
    }
    return a;
  }, []);
  useFrame((s, dt) => {
    const g = group.current;
    g.rotation.y += dt * 0.12;
    g.rotation.x += (s.pointer.y * 0.35 - g.rotation.x) * 0.04;
    g.position.x += (s.pointer.x * 0.3 - g.position.x) * 0.04;
  });
  const col = dark ? "#e8b04a" : "#1e3a5f";
  return (
    <group ref={group}>
      <points>
        <bufferGeometry><bufferAttribute attach="attributes-position" array={positions} count={positions.length / 3} itemSize={3} /></bufferGeometry>
        <pointsMaterial size={0.028} color={col} transparent opacity={dark ? 0.9 : 0.75} depthWrite={false} blending={dark ? THREE.AdditiveBlending : THREE.NormalBlending} />
      </points>
      <mesh rotation={[1.2, 0.3, 0]}>
        <torusGeometry args={[2.7, 0.006, 8, 160]} />
        <meshBasicMaterial color={col} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

export default function Scene() {
  const { dark } = useTheme();
  return (
    <Canvas camera={{ position: [0, 0, 6.5], fov: 45 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
      <Globe dark={dark} />
    </Canvas>
  );
}
