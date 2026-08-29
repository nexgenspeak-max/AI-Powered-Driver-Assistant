import { Screen } from '../../src/components/Screen'
import { AboutContent } from '../../src/features/info/components/AboutContent'

export default function AboutScreen() {
  return (
    <Screen scroll backButton>
      <AboutContent />
    </Screen>
  )
}
