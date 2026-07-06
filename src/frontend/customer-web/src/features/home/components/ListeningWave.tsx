import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshBasicMaterial } from 'three'
import { audioLevels } from '../state/audioLevels'

export default function ListeningWave() {
  const meshRef = useRef<Mesh>(null)

  useFrame((_state, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const material = mesh.material as MeshBasicMaterial
    const level = Math.min(audioLevels.mic * 4, 1)
    const targetScale = 1 + level * 0.6
    mesh.scale.x += (targetScale - mesh.scale.x) * Math.min(delta * 10, 1)
    mesh.scale.y = mesh.scale.x
    material.opacity = 0.15 + level * 0.5
  })

  return (
    <mesh ref={meshRef} position={[0, 1.55, -0.05]}>
      <ringGeometry args={[0.28, 0.3, 48]} />
      <meshBasicMaterial color="#35a4f3" transparent opacity={0.2} toneMapped={false} />
    </mesh>
  )
}
