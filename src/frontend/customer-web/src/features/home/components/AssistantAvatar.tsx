import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture, useFBX, useAnimations } from '@react-three/drei'
import {
  AnimationMixer,
  Euler,
  LineBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  Quaternion,
  SRGBColorSpace,
  Vector2,
  type Group,
  type Mesh,
  type Object3D,
} from 'three'
import blinkData from '../assets/blendDataBlink.json'
import { createBlinkClip } from '../utils/blinkAnimation'
import { audioLevels } from '../state/audioLevels'
import { useAssistantAnimStore } from '../stores/assistantAnimStore'

const ASSETS_BASE = '/assets/avatar-3d'

// Tuning knob for the procedural animation layer — adjust to taste.
const AGENT_JAW_GAIN = 3.2

function setMorph(mesh: Mesh, dict: Record<string, number>, name: string, value: number) {
  const idx = dict[name]
  if (idx === undefined || !mesh.morphTargetInfluences) return
  mesh.morphTargetInfluences[idx] = value
}

export default function AssistantAvatar() {
  const gltf = useGLTF(`${ASSETS_BASE}/model.glb`)
  const groupRef = useRef<Group>(null)
  const bodyMeshRef = useRef<Mesh | null>(null)
  const headBoneRef = useRef<Object3D | null>(null)
  const mouseRef = useRef({ x: 0, y: 0 })

  const [
    bodyTexture,
    eyesTexture,
    teethTexture,
    bodyRoughnessTexture,
    bodyNormalTexture,
    teethNormalTexture,
    hairTexture,
    tshirtDiffuseTexture,
    tshirtNormalTexture,
    tshirtRoughnessTexture,
    hairAlphaTexture,
    hairNormalTexture,
    hairRoughnessTexture,
  ] = useTexture([
    `${ASSETS_BASE}/images/body.webp`,
    `${ASSETS_BASE}/images/eyes.webp`,
    `${ASSETS_BASE}/images/teeth_diffuse.webp`,
    `${ASSETS_BASE}/images/body_roughness.webp`,
    `${ASSETS_BASE}/images/body_normal.webp`,
    `${ASSETS_BASE}/images/teeth_normal.webp`,
    `${ASSETS_BASE}/images/h_color.webp`,
    `${ASSETS_BASE}/images/tshirt_diffuse.webp`,
    `${ASSETS_BASE}/images/tshirt_normal.webp`,
    `${ASSETS_BASE}/images/tshirt_roughness.webp`,
    `${ASSETS_BASE}/images/h_alpha.webp`,
    `${ASSETS_BASE}/images/h_normal.webp`,
    `${ASSETS_BASE}/images/h_roughness.webp`,
  ])

  ;[bodyTexture, eyesTexture, teethTexture, tshirtDiffuseTexture, hairTexture].forEach(t => {
    t.colorSpace = SRGBColorSpace
    t.flipY = false
  })
  ;[bodyRoughnessTexture, bodyNormalTexture, teethNormalTexture, tshirtNormalTexture, tshirtRoughnessTexture, hairAlphaTexture, hairNormalTexture, hairRoughnessTexture].forEach(t => {
    t.colorSpace = NoColorSpace
    t.flipY = false
  })

  const morphTargetDictionaryBody = useRef<Record<string, number> | null>(null)

  const mixer = useMemo(() => new AnimationMixer(gltf.scene), [gltf])

  useEffect(() => {
    gltf.scene.traverse(node => {
      if (node.type !== 'Mesh' && node.type !== 'LineSegments' && node.type !== 'SkinnedMesh') return
      const mesh = node as Mesh
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.frustumCulled = false

      if (mesh.name.includes('Body')) {
        const material = new MeshPhysicalMaterial()
        material.map = bodyTexture
        material.roughness = 1.7
        material.roughnessMap = bodyRoughnessTexture
        material.normalMap = bodyNormalTexture
        material.normalScale = new Vector2(0.6, 0.6)
        material.envMapIntensity = 0.8
        mesh.material = material
        morphTargetDictionaryBody.current = mesh.morphTargetDictionary ?? null
        bodyMeshRef.current = mesh
      }

      if (mesh.name.includes('Eyes')) {
        const material = new MeshStandardMaterial()
        material.map = eyesTexture
        material.roughness = 0.1
        material.envMapIntensity = 0.5
        mesh.material = material
      }

      if (mesh.name.includes('Brows')) {
        mesh.material = new LineBasicMaterial({ color: 0x000000, opacity: 0.5, transparent: true })
        mesh.visible = false
      }

      if (mesh.name.includes('Teeth')) {
        const material = new MeshStandardMaterial()
        material.roughness = 0.1
        material.map = teethTexture
        material.normalMap = teethNormalTexture
        material.envMapIntensity = 0.7
        mesh.material = material
      }

      if (mesh.name.includes('Hair')) {
        const material = new MeshStandardMaterial()
        material.map = hairTexture
        material.alphaMap = hairAlphaTexture
        material.normalMap = hairNormalTexture
        material.roughnessMap = hairRoughnessTexture
        material.transparent = true
        material.depthWrite = false
        material.side = 2
        material.color.setHex(0x000000)
        material.envMapIntensity = 0.3
        mesh.material = material
      }

      if (mesh.name.includes('TSHIRT')) {
        const material = new MeshStandardMaterial()
        material.map = tshirtDiffuseTexture
        material.roughnessMap = tshirtRoughnessTexture
        material.normalMap = tshirtNormalTexture
        material.color.setHex(0xffffff)
        material.envMapIntensity = 0.5
        mesh.material = material
      }
    })

    headBoneRef.current = gltf.scene.getObjectByName('head') ?? null

    if (morphTargetDictionaryBody.current) {
      const blinkClip = createBlinkClip(blinkData, morphTargetDictionaryBody.current, 'HG_Body')
      if (blinkClip) {
        mixer.clipAction(blinkClip).play()
      }
    }
  }, [gltf, mixer, bodyTexture, eyesTexture, teethTexture, bodyRoughnessTexture, bodyNormalTexture, teethNormalTexture, hairTexture, hairAlphaTexture, hairNormalTexture, hairRoughnessTexture, tshirtDiffuseTexture, tshirtNormalTexture, tshirtRoughnessTexture])

  const idleFbx = useFBX(`${ASSETS_BASE}/idle.fbx`)
  const { clips: idleClips } = useAnimations(idleFbx.animations)

  useEffect(() => {
    if (!idleClips[0]) return
    const clip = idleClips[0].clone()
    clip.tracks = clip.tracks
      .filter(track => track.name.includes('Head') || track.name.includes('Neck') || track.name.includes('Spine2'))
      .map(track => {
        if (track.name.includes('Head')) track.name = 'head.quaternion'
        if (track.name.includes('Neck')) track.name = 'neck.quaternion'
        if (track.name.includes('Spine')) track.name = 'spine2.quaternion'
        return track
      })
    mixer.clipAction(clip).play()
  }, [idleClips, mixer])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useFrame((_state, delta) => {
    mixer.update(delta)

    const bodyMesh = bodyMeshRef.current
    const dict = morphTargetDictionaryBody.current
    if (!bodyMesh || !dict) return

    const { state: animState, emotion } = useAssistantAnimStore.getState()
    const t = performance.now() / 1000

    // Idle: subtle breathing on the whole group.
    if (groupRef.current) {
      const breath = 1 + Math.sin(t * 1.2) * 0.008
      groupRef.current.scale.set(breath, breath, breath)
    }

    // Eye look — follows the cursor at idle, overridden while "thinking" (looks up).
    // Left/right blendshape mapping is approximate; tune if it looks mirrored.
    const mouse = mouseRef.current
    const thinking = animState === 'thinking'
    const h = thinking ? 0 : mouse.x
    const v = thinking ? -0.6 : -mouse.y
    setMorph(bodyMesh, dict, 'eyeLookOutLeft', Math.max(h, 0) * 0.4)
    setMorph(bodyMesh, dict, 'eyeLookInRight', Math.max(h, 0) * 0.4)
    setMorph(bodyMesh, dict, 'eyeLookInLeft', Math.max(-h, 0) * 0.4)
    setMorph(bodyMesh, dict, 'eyeLookOutRight', Math.max(-h, 0) * 0.4)
    setMorph(bodyMesh, dict, 'eyeLookDownLeft', Math.max(v, 0) * 0.4)
    setMorph(bodyMesh, dict, 'eyeLookDownRight', Math.max(v, 0) * 0.4)
    setMorph(bodyMesh, dict, 'eyeLookUpLeft', Math.max(-v, 0) * 0.4)
    setMorph(bodyMesh, dict, 'eyeLookUpRight', Math.max(-v, 0) * 0.4)

    // Speaking: jaw driven by the agent's live audio volume (volume-envelope
    // lip-sync, not phoneme-accurate), plus a light emotion-based expression.
    const speaking = animState === 'speaking'
    const jaw = speaking ? Math.min(audioLevels.agent * AGENT_JAW_GAIN, 0.6) : 0
    setMorph(bodyMesh, dict, 'jawOpen', jaw)

    const smileBoost = speaking && (emotion === 'happy' || emotion === 'excited') ? 0.3 : 0
    const frownBoost = speaking && emotion === 'sad' ? 0.3 : 0
    const browDownBoost = speaking && emotion === 'serious' ? 0.3 : 0
    const eyeWideBoost = speaking && emotion === 'excited' ? 0.3 : 0
    setMorph(bodyMesh, dict, 'mouthSmile_L', smileBoost)
    setMorph(bodyMesh, dict, 'mouthSmile_R', smileBoost)
    setMorph(bodyMesh, dict, 'mouthFrown_L', frownBoost)
    setMorph(bodyMesh, dict, 'mouthFrown_R', frownBoost)
    setMorph(bodyMesh, dict, 'browDown_L', browDownBoost)
    setMorph(bodyMesh, dict, 'browDown_R', browDownBoost)
    setMorph(bodyMesh, dict, 'eyeWide_L', eyeWideBoost)
    setMorph(bodyMesh, dict, 'eyeWide_R', eyeWideBoost)

    // Head tilt on top of the idle clip — additive per-frame, so it doesn't fight the mixer.
    const head = headBoneRef.current
    if (head) {
      let tiltX = 0
      let tiltY = 0
      if (thinking) {
        tiltX = -0.08
        tiltY = 0.12
      } else if (animState === 'listening') {
        tiltX = 0.06
      } else if (speaking) {
        tiltX = Math.sin(t * 6) * audioLevels.agent * 1.5
        if (emotion === 'sad') tiltX += 0.05
      }
      const offset = new Quaternion().setFromEuler(new Euler(tiltX, tiltY, 0))
      head.quaternion.multiply(offset)
    }
  })

  return (
    <group name="avatar" ref={groupRef}>
      <primitive object={gltf.scene} dispose={null} />
    </group>
  )
}

useGLTF.preload(`${ASSETS_BASE}/model.glb`)
