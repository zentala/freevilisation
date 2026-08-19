import { useRef } from "react";
import type { Mesh } from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function SpinningCube() {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (mesh === null) {
      return;
    }
    mesh.rotation.x += delta;
    mesh.rotation.y += delta;
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#7c9a5f" />
    </mesh>
  );
}

export default function App() {
  return (
    <div className="h-screen w-screen">
      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 4, 5]} intensity={1.5} />
        <SpinningCube />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
