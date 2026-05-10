"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

function Particles({ count = 1500 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 2.5;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(p) * Math.cos(t);
      arr[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      arr[i * 3 + 2] = r * Math.cos(p);
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.05;
      ref.current.rotation.x += delta * 0.02;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.012}
        color="#7fe3a1"
        transparent
        opacity={0.7}
        sizeAttenuation
      />
    </points>
  );
}

function Orb() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.15;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.5}>
      <Sphere ref={ref} args={[1.3, 96, 96]}>
        <MeshDistortMaterial
          color="#050a07"
          emissive="#1a3d28"
          emissiveIntensity={0.35}
          distort={0.38}
          speed={1.2}
          roughness={0.35}
          metalness={0.85}
        />
      </Sphere>
      <Sphere args={[1.55, 64, 64]}>
        <meshBasicMaterial
          color="#7fe3a1"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
        />
      </Sphere>
    </Float>
  );
}

export function NeuralOrb() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.5], fov: 38 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={1.2} color="#7fe3a1" />
        <pointLight position={[-5, -3, -3]} intensity={0.6} color="#7850c8" />
        <Orb />
        <Particles />
      </Suspense>
    </Canvas>
  );
}
