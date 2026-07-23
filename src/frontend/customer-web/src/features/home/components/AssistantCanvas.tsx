import { Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, OrthographicCamera, useTexture } from '@react-three/drei'
import AssistantAvatar from './AssistantAvatar'
import ThinkingRing from './ThinkingRing'
import ListeningWave from './ListeningWave'
import { useAssistantAnimStore } from '../stores/assistantAnimStore'

const ASSETS_BASE = '/assets/avatar-3d'

// zoom=1400 was tuned against an ~900px-tall canvas. An orthographic camera's
// zoom is an absolute px-per-world-unit scale, so a fixed value renders the
// avatar at a fixed pixel size regardless of canvas size — on a large/wide
// desktop viewport it shrinks to a small box surrounded by empty canvas.
// Scaling zoom by the canvas height keeps the avatar's on-screen size
// proportional to the viewport instead.
const BASE_ZOOM = 1400
const REFERENCE_HEIGHT = 900

function ResponsiveCamera() {
  const height = useThree(s => s.size.height)
  return (
    <OrthographicCamera
      makeDefault
      zoom={BASE_ZOOM * (height / REFERENCE_HEIGHT)}
      position={[0, 1.65, 1]}
    />
  )
}

function Background() {
  const texture = useTexture(`${ASSETS_BASE}/images/background.avif`)
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
      <ResponsiveCamera />
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
