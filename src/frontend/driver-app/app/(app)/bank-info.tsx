import { Alert } from 'react-native'
import { Screen } from '../../src/components/Screen'
import { EmptyState } from '../../src/components/EmptyState'

export default function BankInfoScreen() {
  return (
    <Screen
      scroll
      title="Tài khoản ngân hàng"
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
    >
      <EmptyState
        icon="wallet-outline"
        title="Chưa liên kết tài khoản ngân hàng"
        message="Thêm tài khoản ngân hàng để nhận thanh toán tiền cước trực tiếp. Tính năng này đang được phát triển."
        actionLabel="Thêm tài khoản ngân hàng"
        onAction={() => Alert.alert('Sắp ra mắt', 'Tính năng liên kết tài khoản ngân hàng sẽ sớm khả dụng.')}
      />
    </Screen>
  )
}
