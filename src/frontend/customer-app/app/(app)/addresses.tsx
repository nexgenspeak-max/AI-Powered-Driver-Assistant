import { Alert, ScrollView } from 'react-native'
import { View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BackButton, getBackButtonClearance } from '../../src/components/BackButton'
import { EmptyState } from '../../src/components/EmptyState'

export default function AddressesScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View flex={1} backgroundColor="$surface">
      <BackButton />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: getBackButtonClearance(insets.top) + 16, paddingBottom: 100, justifyContent: 'center', flexGrow: 1 }}
      >
        <EmptyState
          icon="location-outline"
          title="Chưa có địa chỉ đã lưu"
          message="Lưu địa chỉ Nhà, Công ty để đặt xe nhanh hơn ở những lần sau. Tính năng này đang được phát triển."
          actionLabel="Thêm địa chỉ"
          onAction={() => Alert.alert('Sắp ra mắt', 'Tính năng lưu địa chỉ sẽ sớm khả dụng.')}
        />
      </ScrollView>
    </View>
  )
}
