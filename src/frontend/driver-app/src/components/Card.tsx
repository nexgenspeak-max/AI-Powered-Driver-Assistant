import { styled, View } from 'tamagui'

// Dark "glass" card — translucent-feeling elevated fill over the deep-purple
// page background, subtle light border for definition, soft dark glow shadow
// instead of the light-bg drop shadow used before.
export const Card = styled(View, {
  backgroundColor: '$surfaceElevated',
  borderRadius: '$card',
  borderWidth: 1,
  borderColor: '$border',
  padding: '$4',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.35,
  // No `elevation` — Tamagui derives Android's elevation from the shadow*
  // props above automatically, and explicitly excludes elevation from its
  // style prop types (StackStyleBase omits it) since it manages this itself.
  shadowRadius: 16,
})
