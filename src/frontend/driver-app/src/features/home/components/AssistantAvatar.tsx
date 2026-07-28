import { Component, useEffect, useRef, type ReactNode } from 'react'
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl'
import { Renderer } from 'expo-three'
import * as THREE from 'three'
import { View } from 'tamagui'
import { useVoiceSessionStore, type VoiceSessionStatus } from '../stores/voiceSessionStore'
import { useThemeStore } from '../../../stores/themeStore'

// Fast Refresh can reset expo-gl's global.__EXGLContexts registry without the
// native surface re-firing onSurfaceCreate, leaving GLView's context id
// orphaned ("Cannot set property '__expoSetLogging' of undefined" thrown from
// inside expo-gl itself, before our own onContextCreate ever runs). A plain
// try/catch can't reach it — it's thrown from a native event dispatch, not
// from code we call directly — so recovery has to happen via React's error
// boundary + a full remount (changing `key` forces a fresh native GLView
// instance, which fires a fresh onSurfaceCreate/context registration).
class GLErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean; mountKey: number }> {
  state = { crashed: false, mountKey: 0 }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  componentDidUpdate(_prevProps: { children: ReactNode }, prevState: { crashed: boolean }) {
    if (this.state.crashed && !prevState.crashed) {
      requestAnimationFrame(() => this.setState(s => ({ crashed: false, mountKey: s.mountKey + 1 })))
    }
  }

  render() {
    if (this.state.crashed) return null
    return <View key={this.state.mountKey}>{this.props.children}</View>
  }
}

const SIZE = 360
const DOT_SIZE = 0.038
const NOISE_AMOUNT = 0.42
// Exponential smoothing rate (1/seconds) for the audio-energy signal driving
// the shape/rotation/glow — see the render loop below for why this needs to
// be slow enough to absorb LiveKit's ~200ms-interval level updates into one
// continuous curve. ~1/2.8 ≈ 350ms time constant.
const ENERGY_SMOOTHING_RATE = 2.8
// Shrinks the whole orb (points + glow together, see `group.scale` below) —
// a size tweak, so it lives here rather than touching camera/geometry math.
const ORB_SCALE = 0.72
// Dense enough to read as a fine speckled sphere. Cheap even at this count
// since the per-frame deformation runs in the vertex shader (GPU), not a JS
// loop — see the shader source below.
const POINT_COUNT = 7000

// Three traveling plane waves, each along its own direction/frequency/speed
// and summed — this is what actually reads as "liquid 3D undulation" instead
// of the old single low-frequency blob (one slow lobe bulging in and out was
// the "tù"/blunt look): with several oscillations crossing the sphere at
// once, at different angles and speeds, no two points move exactly in sync,
// so the surface visibly ripples/flows rather than just breathing in place.
const NOISE_GLSL = `
  float fieldNoise(vec3 p, float t) {
    float w1 = sin(dot(p, vec3(1.0, 0.6, 0.3)) * 3.1 - t * 1.6);
    float w2 = sin(dot(p, vec3(-0.4, 1.0, 0.7)) * 4.3 + t * 1.1);
    float w3 = sin(dot(p, vec3(0.8, -0.5, 1.0)) * 5.6 - t * 2.0);
    return w1 * 0.5 + w2 * 0.32 + w3 * 0.18;
  }
`

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uEnergy;
  uniform float uSize;
  uniform float uScale;

  attribute vec3 color;
  varying vec3 vColor;

  ${NOISE_GLSL}

  void main() {
    vColor = color;
    float n = fieldNoise(position, uTime) * uEnergy;
    float displacedScale = 1.0 + n * ${NOISE_AMOUNT};
    vec4 mvPosition = modelViewMatrix * vec4(position * displacedScale, 1.0);
    // Mirrors three.js's own PointsMaterial sizeAttenuation formula
    // (gl_PointSize = size * scale / -mvPosition.z) so dots stay the same
    // apparent size this app already had before the custom shader.
    gl_PointSize = uSize * uScale / -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec3 vColor;

  void main() {
    // Round dot computed directly from gl_PointCoord instead of sampling a
    // circular alpha-mask texture — a mask can read blurry/blocky on
    // low-end GPUs at a few px across (the previous approach), this is
    // exact regardless of device.
    vec2 centered = gl_PointCoord - vec2(0.5);
    float dist = length(centered) * 2.0;
    // Soft radial falloff from full brightness at the center instead of a
    // near-solid disc with only a thin fading rim — at high point density
    // (7000 dots packed onto a smaller sphere) many overlapping solid discs
    // under additive blending summed into a blown-out glare instead of
    // reading as individual dots. A gentler per-dot falloff keeps the
    // overlap glow subtle so the sparkle/detail stays visible.
    float alpha = pow(max(0.0, 1.0 - dist), 1.8);
    if (alpha <= 0.02) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`

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

// Evenly distributes `n` points over a unit sphere via the golden-angle
// spiral (a.k.a. Fibonacci sphere) — unlike subdividing an icosahedron, this
// gives exact control over point count at any density without being
// quantized to a mesh's ~4x-per-subdivision-level jumps.
function fibonacciSpherePositions(n: number) {
  const positions = new Float32Array(n * 3)
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = goldenAngle * i
    positions[i * 3] = Math.cos(theta) * radiusAtY
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = Math.sin(theta) * radiusAtY
  }
  return positions
}

export function AssistantAvatar({ status }: { status: VoiceSessionStatus }) {
  // Shape is driven by the AI's actual voice loudness (agentAudioLevel, 0..1
  // from LiveKit's ActiveSpeakersChanged), not a fixed animation — silent =
  // perfect sphere, louder speech = more deformed. Read/written straight from
  // the render loop (imperative three.js), not React state — a re-render per
  // animation frame would be far too slow.
  const audioLevel = useVoiceSessionStore(s => s.agentAudioLevel)
  // White-topped dots use additive blending, which washes out to near-
  // invisible against a light-mode screen (the same contrast problem the
  // AI chat bubble had) — light mode swaps to a dark purple/near-black
  // gradient instead, same idea as that bubble fix.
  const isLight = useThemeStore(s => s.mode) === 'light'
  const targetEnergyRef = useRef(0)
  const energyRef = useRef(0)
  const mountedRef = useRef(true)
  const rafRef = useRef(0)

  useEffect(() => {
    // Raw audioLevel tends to sit low even for normal speech loudness — scale
    // it up, then apply a <1 power curve so quieter/normal speech still
    // visibly animates instead of needing near-shouting volume to see any
    // motion (a linear 0..1 mapping left most ordinary talking stuck near
    // the flat, undeformed end of the range). Clamped to the 0..1 the noise
    // field expects, forced to 0 whenever not actively connected in case a
    // stale level lingers past disconnect.
    targetEnergyRef.current = status === 'connected' ? Math.pow(Math.min(1, audioLevel * 2.4), 0.6) : 0
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
    // `gl.drawingBufferWidth/Height`, not the logical `SIZE` — the GL
    // framebuffer is already scaled by the device's pixel ratio (e.g. 1080px
    // for a 360dp box at pixelRatio 3). Sizing the renderer to the smaller
    // logical value left the viewport covering only a corner of the actual
    // buffer, which is what drew the sphere off-center inside the (correctly
    // centered) GLView box.
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight)
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10)
    camera.position.z = 3.4

    const basePositions = fibonacciSpherePositions(POINT_COUNT)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(basePositions, 3))

    // Dark mode: white -> pink -> muted purple, bright against the dark
    // screen behind it. Light mode: deep purple -> vivid purple -> near-
    // black purple — same brand hues, inverted toward dark so the orb
    // still reads clearly against a light screen instead of blowing out.
    const colorTop = new THREE.Color(isLight ? '#4c1d95' : '#ffffff')
    const colorMid = new THREE.Color(isLight ? '#a855f7' : '#e879f9')
    const colorBottom = new THREE.Color(isLight ? '#1e1033' : '#7C5B9C')
    const colors = new Float32Array(POINT_COUNT * 3)
    for (let i = 0; i < POINT_COUNT; i++) {
      const y = basePositions[i * 3 + 1]
      const c = y > 0 ? colorTop.clone().lerp(colorMid, 1 - y) : colorMid.clone().lerp(colorBottom, -y)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    // Custom shader instead of PointsMaterial — the deformation (fieldNoise)
    // runs per-vertex on the GPU every frame instead of a JS loop rewriting
    // the whole position buffer, which is what makes POINT_COUNT=7000
    // affordable (a JS loop at that count was the actual jank risk, not the
    // point rendering itself).
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uEnergy: { value: 0 },
        // `uSize` is a fixed pixel-ish size independent of `group.scale`
        // (it isn't run through modelViewMatrix) — without scaling it down
        // to match ORB_SCALE, the same dots that were correctly sized for
        // the old, bigger sphere now cover proportionally more of the
        // smaller one, overlapping into a blown-out glare under additive
        // blending instead of reading as individual "chấm" (dots).
        uSize: { value: DOT_SIZE * ORB_SCALE },
        // Mirrors three.js's internal `scale` uniform for PointsMaterial's
        // sizeAttenuation (~half the framebuffer height).
        uScale: { value: gl.drawingBufferHeight * 0.5 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const points = new THREE.Points(geometry, material)

    const glowMaterial = new THREE.SpriteMaterial({
      map: createGlowTexture(),
      color: 0xa855f7,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.4,
    })
    const glow = new THREE.Sprite(glowMaterial)
    glow.scale.set(3.4, 3.4, 1)
    glow.position.z = -0.5

    // Both points and glow scale together as one orb — keeps the halo
    // proportional to the sphere instead of shrinking just the dots and
    // leaving an oversized glow around a smaller ball.
    const group = new THREE.Group()
    group.add(points)
    group.add(glow)
    group.scale.setScalar(ORB_SCALE)
    scene.add(group)

    const start = Date.now()
    let lastFrameMs = Date.now()
    let rotationY = 0

    const render = () => {
      if (!mountedRef.current) return
      const now = Date.now()
      const t = (now - start) / 1000
      const dtSec = Math.min(0.1, Math.max(0, (now - lastFrameMs) / 1000))
      lastFrameMs = now

      // `agentAudioLevel` (the target this eases toward) only updates
      // ~every 200ms from LiveKit's ActiveSpeakersChanged (see
      // voiceSessionStore.ts) — it's a staircase, not a continuous signal.
      // The old fixed 0.15-per-frame lerp had an effective time constant of
      // only ~110ms, meaning energy nearly fully caught up to each new raw
      // step *before the next one arrived* — the shape/rotation/glow were
      // all riding that staircase almost directly, which read as "giật
      // giật" (jerky) rather than one continuous motion. This uses a
      // frame-rate-independent exponential smoothing (stable even if
      // frames drop, unlike a fixed per-frame multiply) with a slower
      // ~350ms time constant, long enough to blend consecutive 200ms steps
      // into a single flowing curve instead of visibly re-aiming every step.
      const smoothing = 1 - Math.exp(-ENERGY_SMOOTHING_RATE * dtSec)
      energyRef.current += (targetEnergyRef.current - energyRef.current) * smoothing

      material.uniforms.uTime.value = t
      material.uniforms.uEnergy.value = energyRef.current

      // Spins up while speaking — reinforces the deforming shape as an
      // "energy" cue instead of it being the only signal, and gives the orb
      // a livelier feel than a fixed idle spin. Accumulated incrementally
      // (rotationY += rate * dt) instead of the old `t * rate`: with a
      // rate that depends on energyRef (which jumps whenever AI speech
      // starts/stops), recomputing straight from elapsed time `t` made the
      // orb's orientation SNAP the instant energy changed — after minutes
      // in a call, `t` is large, so even a small rate change multiplied
      // across all of `t` was a big instantaneous jump, which is what read
      // as the sphere "changing shape" at every pause/resume. Accumulating
      // means only the *time since the last frame* (a tiny dt) gets the new
      // rate, so a rate change is smooth and continuous, never a jump.
      rotationY += (0.15 + energyRef.current * 0.25) * dtSec
      points.rotation.y = rotationY
      points.rotation.x = Math.sin(t * 0.1) * 0.08

      const glowScale = 3.4 + energyRef.current * 0.6
      glow.scale.set(glowScale, glowScale, 1)
      glowMaterial.opacity = 0.4 + energyRef.current * 0.18

      renderer.render(scene, camera)
      gl.endFrameEXP()
      rafRef.current = requestAnimationFrame(render)
    }
    render()
  }

  return (
    <View width="100%" alignItems="center" justifyContent="center" paddingTop="$2">
      <GLErrorBoundary>
        <GLView style={{ width: SIZE, height: SIZE }} onContextCreate={onContextCreate} />
      </GLErrorBoundary>
    </View>
  )
}
