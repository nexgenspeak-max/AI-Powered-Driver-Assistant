import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import type { Mesh } from 'three'

export default function ThinkingRing() {
  const ringRef = useRef<Mesh>(null)

  useFrame((_state, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 1.2
    }
  })

  return (
    <group position={[0, 1.95, 0]}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.008, 8, 48]} />
        <meshStandardMaterial color="#7fd8ff" emissive="#3fa9ff" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <Sparkles count={12} scale={[0.5, 0.3, 0.3]} position={[0, -0.35, 0.05]} size={2} speed={0.4} color="#7fd8ff" />
    </group>
  )
}
