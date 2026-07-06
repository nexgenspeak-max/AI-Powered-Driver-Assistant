import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture, useFBX, useAnimations } from '@react-three/drei'
import {
  AnimationMixer,
  LineBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  SRGBColorSpace,
  Vector2,
  type Mesh,
} from 'three'
import blinkData from '../assets/blendDataBlink.json'
import { createBlinkClip } from '../utils/blinkAnimation'

const ASSETS_BASE = '/assets/avatar-3d'

export default function AssistantAvatar() {
  const gltf = useGLTF(`${ASSETS_BASE}/model.glb`)

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

  useFrame((_state, delta) => {
    mixer.update(delta)
  })

  return (
    <group name="avatar">
      <primitive object={gltf.scene} dispose={null} />
    </group>
  )
}

useGLTF.preload(`${ASSETS_BASE}/model.glb`)
