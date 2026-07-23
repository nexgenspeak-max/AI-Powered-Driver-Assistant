import { Alert, ScrollView } from 'react-native'
import { View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BackButton, getBackButtonClearance } from '../../src/components/BackButton'
import { EmptyState } from '../../src/components/EmptyState'

export default function BankInfoScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View flex={1} backgroundColor="$surface">
      <BackButton />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: getBackButtonClearance(insets.top) + 16, paddingBottom: 100, justifyContent: 'center', flexGrow: 1 }}
      >
        <EmptyState
          icon="wallet-outline"
          title="Chưa liên kết tài khoản ngân hàng"
          message="Thêm tài khoản ngân hàng để nhận thanh toán tiền cước trực tiếp. Tính năng này đang được phát triển."
          actionLabel="Thêm tài khoản ngân hàng"
          onAction={() => Alert.alert('Sắp ra mắt', 'Tính năng liên kết tài khoản ngân hàng sẽ sớm khả dụng.')}
        />
      </ScrollView>
    </View>
  )
}
