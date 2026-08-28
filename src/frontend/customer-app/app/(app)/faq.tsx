import { ScrollView } from 'react-native'
import { View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BackButton, getBackButtonClearance } from '../../src/components/BackButton'
import { AppText } from '../../src/components/AppText'
import { FaqContent } from '../../src/features/info/components/FaqContent'

export default function FaqScreen() {
  const insets = useSafeAreaInsets()
  return (
    <View flex={1} backgroundColor="$surface">
      <BackButton />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: getBackButtonClearance(insets.top) + 16, paddingBottom: 100, gap: 20 }}
      >
        <AppText variant="h1">Câu hỏi thường gặp</AppText>
        <FaqContent />
      </ScrollView>
    </View>
  )
}
