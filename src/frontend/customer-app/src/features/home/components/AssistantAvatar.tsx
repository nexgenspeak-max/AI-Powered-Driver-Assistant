import { useEffect, useRef } from 'react'
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl'
import { Renderer } from 'expo-three'
import * as THREE from 'three'
import { View } from 'tamagui'
import { useVoiceSessionStore, type VoiceSessionStatus } from '../stores/voiceSessionStore'

const SIZE = 360
const DOT_SIZE = 0.045
const NOISE_FREQ = 1.6
const NOISE_AMOUNT = 0.32

// Smooth, continuous 3D deformation field over the sphere's own (x, y, z) and
// time — a handful of low-frequency sine "lobes" rather than per-vertex
// random noise, so neighboring points on the mesh bulge/breathe together
// instead of scattering into unrelated jitter.
function fieldNoise(x: number, y: number, z: number, t: number) {
  return (
    Math.sin(x * NOISE_FREQ + t * 0.5) * Math.cos(y * NOISE_FREQ - t * 0.3) * 0.5 +
    Math.sin(y * NOISE_FREQ * 1.3 - t * 0.4 + z) * 0.3 +
    Math.cos(z * NOISE_FREQ * 1.1 + t * 0.35 + x) * 0.2
  )
}

function createGlowTexture() {
  const size = 64
  const data = new Uint8Array(size * size * 4)
  const center = size / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center
      const dy = y - center
      const dist = Math.sqrt(dx * dx + dy * dy) / center
      const alpha = Math.max(0, 1 - dist)
      const idx = (y * size + x) * 4
      data[idx] = 255
      data[idx + 1] = 255
      data[idx + 2] = 255
      data[idx + 3] = Math.pow(alpha, 2) * 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.needsUpdate = true
  return tex
}

export function AssistantAvatar({ status }: { status: VoiceSessionStatus }) {
  // Shape is driven by the AI's actual voice loudness (agentAudioLevel, 0..1
  // from LiveKit's ActiveSpeakersChanged), not a fixed animation — silent =
  // perfect sphere, louder speech = more deformed. Read/written straight from
  // the render loop (imperative three.js), not React state — a re-render per
  // animation frame would be far too slow.
  const audioLevel = useVoiceSessionStore(s => s.agentAudioLevel)
  const targetEnergyRef = useRef(0)
  const energyRef = useRef(0)
  const mountedRef = useRef(true)
  const rafRef = useRef(0)

  useEffect(() => {
    // Raw audioLevel tends to sit low even for normal speech loudness — scale
    // it up so the deformation reads clearly, clamped to the 0..1 the noise
    // field expects. Forced to 0 whenever not actively connected, in case a
    // stale level lingers past disconnect.
    targetEnergyRef.current = status === 'connected' ? Math.min(1, audioLevel * 2.4) : 0
  }, [status, audioLevel])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    // expo-three's bundled .d.ts under-declares Renderer (it's a real
    // THREE.WebGLRenderer at runtime) — cast to get proper method types.
    const renderer = new Renderer({ gl }) as unknown as THREE.WebGLRenderer
    renderer.setSize(SIZE, SIZE)
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10)
    camera.position.z = 3.4

    const geometry = new THREE.IcosahedronGeometry(1, 3)
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    const basePositions = Float32Array.from(posAttr.array as Float32Array)
    const count = posAttr.count

    const colorTop = new THREE.Color('#ffffff')
    const colorMid = new THREE.Color('#e879f9')
    const colorBottom = new THREE.Color('#7C5B9C')
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const y = basePositions[i * 3 + 1]
      const c = y > 0 ? colorTop.clone().lerp(colorMid, 1 - y) : colorMid.clone().lerp(colorBottom, -y)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: DOT_SIZE,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    const glowMaterial = new THREE.SpriteMaterial({
      map: createGlowTexture(),
      color: 0xa855f7,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.5,
    })
    const glow = new THREE.Sprite(glowMaterial)
    glow.scale.set(3.4, 3.4, 1)
    glow.position.z = -0.5
    scene.add(glow)

    const start = Date.now()

    const render = () => {
      if (!mountedRef.current) return
      const t = (Date.now() - start) / 1000
      // Faster-than-before easing so the shape visibly tracks speech rhythm
      // instead of lagging behind syllables.
      energyRef.current += (targetEnergyRef.current - energyRef.current) * 0.15

      const pos = points.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < count; i++) {
        const bx = basePositions[i * 3]
        const by = basePositions[i * 3 + 1]
        const bz = basePositions[i * 3 + 2]
        const n = fieldNoise(bx, by, bz, t) * energyRef.current
        const scale = 1 + n * NOISE_AMOUNT
        pos.setXYZ(i, bx * scale, by * scale, bz * scale)
      }
      pos.needsUpdate = true

      points.rotation.y = t * 0.15
      points.rotation.x = Math.sin(t * 0.1) * 0.08

      renderer.render(scene, camera)
      gl.endFrameEXP()
      rafRef.current = requestAnimationFrame(render)
    }
    render()
  }

  return (
    <View width="100%" alignItems="center" justifyContent="center" paddingTop="$2">
      {/* TEMP DEBUG BORDER — shows whether the empty GLView box itself sits
          centered (RN layout is fine, the 3D content draws off-center inside
          it) or the box itself is mispositioned (a layout/flex problem). */}
      <GLView
        style={{ width: SIZE, height: SIZE, borderWidth: 2, borderColor: '#00ff00' }}
        onContextCreate={onContextCreate}
      />
    </View>
  )
}
