import { Alert, ScrollView } from 'react-native'
import { View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BackButton, getBackButtonClearance } from '../../src/components/BackButton'
import { EmptyState } from '../../src/components/EmptyState'

export default function PromotionsScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View flex={1} backgroundColor="$surface">
      <BackButton />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: getBackButtonClearance(insets.top) + 16, paddingBottom: 100, justifyContent: 'center', flexGrow: 1 }}
      >
        <EmptyState
          icon="pricetag-outline"
          title="Chưa có mã khuyến mãi nào"
          message="Các mã giảm giá và ưu đãi bạn sở hữu sẽ hiển thị ở đây. Tính năng này đang được phát triển."
          actionLabel="Nhập mã khuyến mãi"
          onAction={() => Alert.alert('Sắp ra mắt', 'Tính năng nhập mã khuyến mãi sẽ sớm khả dụng.')}
        />
      </ScrollView>
    </View>
  )
}
