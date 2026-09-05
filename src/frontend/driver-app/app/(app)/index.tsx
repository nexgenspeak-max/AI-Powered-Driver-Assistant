/**
 * Full-bleed map home — no Screen shell (map exception).
 * Voice + chat open from the center Trợ lý AI orb (tab bar); no floating chat FAB.
 */
import { View } from 'react-native'
import { DriverMap } from '../../src/features/home/components/DriverMap'

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <DriverMap />
    </View>
  )
}
