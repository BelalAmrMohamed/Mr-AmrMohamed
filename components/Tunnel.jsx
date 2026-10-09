"use client";
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTheme } from "./Theme";

// Services effect: a tunnel of particles and rings that rushes toward the camera as `progress.current` grows.
function World({ progress, dark }) {
  const g = useRef();
  const pts = useMemo(() => {
    const n = 1800, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const t = Math.random() * 6.283, r = 2 + Math.random() * 7;
      a.set([Math.cos(t) * r, Math.sin(t) * r, -Math.random() * 70], i * 3);
    }
    return a;
  }, []);
  useFrame((s) => {
    g.current.position.z += (progress.current * 62 - g.current.position.z) * 0.08;
    g.current.rotation.z += (s.pointer.x * 0.15 - g.current.rotation.z) * 0.03;
    s.camera.position.x += (s.pointer.x * 0.6 - s.camera.position.x) * 0.04;
    s.camera.position.y += (s.pointer.y * 0.4 - s.camera.position.y) * 0.04;
  });
  const col = dark ? "#e8b04a" : "#1e3a5f";
  return (
    <group ref={g}>
      <points>
        <bufferGeometry><bufferAttribute attach="attributes-position" array={pts} count={pts.length / 3} itemSize={3} /></bufferGeometry>
        <pointsMaterial size={0.06} color={col} transparent opacity={0.85} depthWrite={false} blending={dark ? THREE.AdditiveBlending : THREE.NormalBlending} />
      </points>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[0, 0, -i * 6]}>
          <torusGeometry args={[6 + (i % 2), 0.012, 6, 80]} />
          <meshBasicMaterial color={col} transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  );
}
export default function Tunnel({ progress }) {
  const { dark } = useTheme();
  return <Canvas camera={{ position: [0, 0, 5], fov: 60 }} dpr={[1, 1.5]} gl={{ alpha: true }}><fog attach="fog" args={[dark ? "#090c14" : "#f7f4ee", 8, 40]} /><World progress={progress} dark={dark} /></Canvas>;
}
