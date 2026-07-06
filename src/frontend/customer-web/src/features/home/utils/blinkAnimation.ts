import { AnimationClip, NumberKeyframeTrack } from 'three'

const FPS = 60

type BlendshapeFrame = { blendshapes: Record<string, number> }

function modifiedKey(key: string): string {
  if (key.endsWith('Right')) return key.replace('Right', '_R')
  if (key.endsWith('Left')) return key.replace('Left', '_L')
  return key
}

/**
 * Builds a local (server-free) AnimationClip from recorded blendshape frames.
 * Used only for the idle blink loop — the speech/lip-sync clip path from the
 * original Prompt3D `createAnimation` (driven by a remote TTS backend) is dropped.
 */
export function createBlinkClip(
  recordedData: BlendshapeFrame[],
  morphTargetDictionary: Record<string, number>,
  bodyPart: string,
): AnimationClip | null {
  if (recordedData.length === 0) return null

  const morphCount = Object.keys(morphTargetDictionary).length
  const animation: number[][] = Array.from({ length: morphCount }, () => [])
  const time: number[] = []

  recordedData.forEach((frame, i) => {
    Object.entries(frame.blendshapes).forEach(([key, value]) => {
      const mapped = modifiedKey(key)
      if (!(mapped in morphTargetDictionary)) return
      animation[morphTargetDictionary[mapped]].push(value)
    })
    time.push(i / FPS)
  })

  const tracks: NumberKeyframeTrack[] = []
  Object.keys(recordedData[0].blendshapes).forEach(key => {
    const mapped = modifiedKey(key)
    if (!(mapped in morphTargetDictionary)) return
    const i = morphTargetDictionary[mapped]
    tracks.push(new NumberKeyframeTrack(`${bodyPart}.morphTargetInfluences[${i}]`, time, animation[i]))
  })

  return new AnimationClip('blink', -1, tracks)
}
