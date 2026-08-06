import { Component, useEffect, useRef, type ReactNode } from 'react'
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl'
import { Renderer } from 'expo-three'
import * as THREE from 'three'
import { View } from 'tamagui'
import { type VoiceSessionStatus } from '../stores/voiceSessionStore'
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
// Shrunk slightly from 0.038 alongside the higher POINT_COUNT below — same
// dot count increase without a corresponding size trim would overlap into a
// blown-out glare under additive blending instead of reading as more
// individual "chấm" detail.
const DOT_SIZE = 0.032
const NOISE_AMOUNT = 0.42
// Exponential smoothing rates (1/seconds) for the energy signal driving the
// shape/rotation/glow — see the render loop below. The orb no longer reacts
// to the AI's actual audio level/speaking state at all: it just eases toward
// a constant target while connected (CONNECTED_ENERGY) and back to 0 once
// disconnected, so it animates continuously for the whole call regardless of
// whether the AI happens to be making sound at that instant.
// Rising (on connect) always uses this — fast/responsive, ~1/2.8 ≈ 350ms
// time constant.
const ENERGY_ATTACK_RATE = 2.8
// Falling (on disconnect) — eases the rest of the way to a perfect sphere.
// Slow and deliberate so the shrink reads as a gradual wind-down, never a
// snap.
const ENERGY_RELEASE_RATE = 0.4
// Constant target energy held for the entire duration of a connected call —
// see comment above.
const CONNECTED_ENERGY = 0.55
// Holding the target near-constant while connected (CONNECTED_ENERGY, above)
// keeps the orb from ever going still, but a fixed amplitude alone just
// deforms the same "amount" every frame — no rise and fall, so it reads as a
// static bumpy blob instead of an actual undulating wave. This gently
// swells/recedes the *displayed* amplitude (never the underlying energyRef
// the attack/release smoothing works on) on a slow sine, independent of
// audio — a real ocean swell rhythm, always running for the whole call.
const BREATHE_DEPTH = 0.3
const BREATHE_RATE = 0.45 // rad/s — ~14s per full swell cycle (was 0.7/~9s — slowed further for a calmer feel)
// Shrinks the whole orb (points + glow together, see `group.scale` below) —
// a size tweak, so it lives here rather than touching camera/geometry math.
const ORB_SCALE = 0.72
// Raised from 7000 for a finer, more detailed speckled sphere (see
// DOT_SIZE's own shrink above, which offsets the density increase). Still
// cheap at this count since the per-frame deformation runs in the vertex
// shader (GPU), not a JS loop — see the shader source below.
const POINT_COUNT = 11000

// Three traveling plane waves, each along its own direction/frequency/speed
// and summed — this is what actually reads as "liquid 3D undulation" instead
// of the old single low-frequency blob (one slow lobe bulging in and out was
// the "tù"/blunt look): with several oscillations crossing the sphere at
// once, at different angles and speeds, no two points move exactly in sync,
// so the surface visibly ripples/flows rather than just breathing in place.
// Time multipliers slowed further, to ~60% of the already-slowed pass (was
// 1.0/0.7/1.2, themselves ~60% of the original 1.6/1.1/2.0) for an even
// calmer ripple that reads as ambient rather than agitated — same
// three-wave composition, just unhurried.
const NOISE_GLSL = `
  float fieldNoise(vec3 p, float t) {
    float w1 = sin(dot(p, vec3(1.0, 0.6, 0.3)) * 3.1 - t * 0.6);
    float w2 = sin(dot(p, vec3(-0.4, 1.0, 0.7)) * 4.3 + t * 0.42);
    float w3 = sin(dot(p, vec3(0.8, -0.5, 1.0)) * 5.6 - t * 0.72);
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
  // Shape/motion no longer reacts to the AI's actual audio at all — it just
  // eases to a constant animated target for as long as `status` is
  // 'connected' (see CONNECTED_ENERGY) and back to a still sphere once it
  // isn't, so the orb keeps moving continuously for the whole call
  // regardless of whether the AI happens to be making sound at any instant.
  // White-topped dots use additive blending, which washes out to near-
  // invisible against a light-mode screen (the same contrast problem the
  // AI chat bubble had) — light mode swaps to a dark purple/near-black
  // gradient instead, same idea as that bubble fix.
  const isLight = useThemeStore(s => s.mode) === 'light'
  const targetEnergyRef = useRef(0)
  const energyRef = useRef(0)
  const statusRef = useRef(status)
  const mountedRef = useRef(true)
  const rafRef = useRef(0)

  useEffect(() => {
    statusRef.current = status
  }, [status])

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

    // Dark mode: brighter and much more even top-to-bottom (was '#b794f6' ->
    // '#9333ea' -> '#3b0764', which fell off to a near-black base) — the
    // three stops now sit close together in the same bright purple range
    // instead of a light top fading into a dark bottom, so the whole sphere
    // reads as one uniformly bright color rather than top-lit/bottom-
    // shadowed.
    // Light mode: pushed much darker/richer than before (was '#3b0764' ->
    // '#9333ea' -> '#150a26', which still had a fairly bright, saturated
    // middle) — all three stops deepened toward a dark, dense purple-black
    // so it reads as bold and dark against a light screen instead of
    // washing out toward brighter purple in the middle band.
    const colorTop = new THREE.Color(isLight ? '#2e1065' : '#e9d5ff')
    const colorMid = new THREE.Color(isLight ? '#5b21b6' : '#c084fc')
    const colorBottom = new THREE.Color(isLight ? '#0f0720' : '#a855f7')
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

      // Constant target for the whole call — no audio/speaking signal
      // involved at all, so the orb animates the same continuous way
      // regardless of whether the AI is actually making sound right now.
      // Recomputed every frame straight from the ref (not a `useEffect`
      // reacting to prop changes) since `status` can flip between renders.
      targetEnergyRef.current = statusRef.current === 'connected' ? CONNECTED_ENERGY : 0

      // Frame-rate-independent exponential smoothing (stable even if frames
      // drop, unlike a fixed per-frame multiply) — fast attack on connect,
      // slow release on disconnect so the shrink back to a sphere reads as a
      // gradual wind-down, never a snap.
      const rising = targetEnergyRef.current > energyRef.current
      const rate = rising ? ENERGY_ATTACK_RATE : ENERGY_RELEASE_RATE
      const smoothing = 1 - Math.exp(-rate * dtSec)
      energyRef.current += (targetEnergyRef.current - energyRef.current) * smoothing

      // Swells/recedes the displayed amplitude on a slow sine independent of
      // energyRef itself — see BREATHE_DEPTH/BREATHE_RATE above for why.
      // Scaled by energyRef so an idle sphere (energy 0) still breathes 0,
      // not a phantom ripple with nothing driving it.
      const breathe = 1 + BREATHE_DEPTH * Math.sin(t * BREATHE_RATE)
      const displayEnergy = Math.max(0, energyRef.current * breathe)

      material.uniforms.uTime.value = t
      material.uniforms.uEnergy.value = displayEnergy

      // Spins up while connected — reinforces the deforming shape as an
      // "energy" cue, and gives the orb a livelier feel than a fixed idle
      // spin. Accumulated incrementally (rotationY += rate * dt) instead of
      // `t * rate`: with a rate that depends on energyRef (which jumps on
      // connect/disconnect), recomputing straight from elapsed time `t`
      // would make the orb's orientation SNAP the instant energy changed —
      // after minutes in a call, `t` is large, so even a small rate change
      // multiplied across all of `t` is a big instantaneous jump.
      // Accumulating means only the *time since the last frame* (a tiny dt)
      // gets the new rate, so a rate change is smooth and continuous, never
      // a jump.
      // Rates slowed further, to ~60% of the already-slowed pass (was 0.09
      // base / 0.15 energy-driven, themselves ~60% of the original 0.15 /
      // 0.25) — same idea, even calmer pace.
      rotationY += (0.055 + energyRef.current * 0.09) * dtSec
      points.rotation.y = rotationY
      points.rotation.x = Math.sin(t * 0.1) * 0.08

      // Rides the same breathing swell as the point cloud (displayEnergy,
      // not raw energyRef) so the halo pulses in sync with the wave instead
      // of sitting at a flat size while only the dots ripple.
      const glowScale = 3.4 + displayEnergy * 0.6
      glow.scale.set(glowScale, glowScale, 1)
      glowMaterial.opacity = 0.4 + displayEnergy * 0.18

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
