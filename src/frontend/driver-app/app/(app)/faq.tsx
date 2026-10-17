import { Screen } from '../../src/components/Screen'
import { AppText } from '../../src/components/AppText'
import { FaqContent } from '../../src/features/info/components/FaqContent'

export default function FaqScreen() {
  return (
    <Screen scroll title="Câu hỏi thường gặp">
      <FaqContent />
    </Screen>
  )
}
