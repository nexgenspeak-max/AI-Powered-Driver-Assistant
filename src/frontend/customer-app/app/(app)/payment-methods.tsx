import { Alert, ScrollView } from 'react-native'
import { View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BackButton, getBackButtonClearance } from '../../src/components/BackButton'
import { EmptyState } from '../../src/components/EmptyState'

export default function PaymentMethodsScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View flex={1} backgroundColor="$surface">
      <BackButton />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: getBackButtonClearance(insets.top) + 16, paddingBottom: 100, justifyContent: 'center', flexGrow: 1 }}
      >
        <EmptyState
          icon="card-outline"
          title="Chưa có phương thức thanh toán"
          message="Thêm thẻ ngân hàng hoặc ví điện tử để thanh toán chuyến đi nhanh hơn. Tính năng này đang được phát triển."
          actionLabel="Thêm phương thức thanh toán"
          onAction={() => Alert.alert('Sắp ra mắt', 'Tính năng thêm phương thức thanh toán sẽ sớm khả dụng.')}
        />
      </ScrollView>
    </View>
  )
}
