import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, OrthographicCamera, useTexture } from '@react-three/drei'
import AssistantAvatar from './AssistantAvatar'
import ThinkingRing from './ThinkingRing'
import ListeningWave from './ListeningWave'
import { useAssistantAnimStore } from '../stores/assistantAnimStore'

const ASSETS_BASE = '/assets/avatar-3d'

function Background() {
  const texture = useTexture(`${ASSETS_BASE}/images/background.jpg`)
  return (
    <mesh position={[0, 1.5, -4]} scale={[1.2, 1.2, 1.2]}>
      <planeGeometry />
      <meshBasicMaterial map={texture} />
    </mesh>
  )
}

export default function AssistantCanvas() {
  const state = useAssistantAnimStore(s => s.state)

  return (
    <Canvas dpr={2}>
      <OrthographicCamera makeDefault zoom={1400} position={[0, 1.65, 1]} />
      <pointLight position={[0.15, 1.9, 0.6]} intensity={0.6} distance={1.5} color="#dfefff" />

      <Suspense fallback={null}>
        <Environment background={false} files={`${ASSETS_BASE}/images/photo_studio_loft_hall_1k.hdr`} />
      </Suspense>

      <Suspense fallback={null}>
        <Background />
      </Suspense>

      <Suspense fallback={null}>
        <AssistantAvatar />
      </Suspense>

      {state === 'thinking' && <ThinkingRing />}
      {state === 'listening' && <ListeningWave />}
    </Canvas>
  )
}
