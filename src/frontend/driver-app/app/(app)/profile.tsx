import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useDriverContext } from '../../src/features/dashboard/hooks/useDriverContext'
import { ProfileCard } from '../../src/features/profile/components/ProfileCard'
import { Card } from '../../src/components/Card'
import { Button } from '../../src/components/Button'
import { useAuthStore } from '../../src/stores/authStore'

export default function ProfileScreen() {
  const driver = useAuthStore(s => s.driver)!
  const logout = useAuthStore(s => s.logout)
  const { data: context, isLoading } = useDriverContext()

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-5 pt-16 gap-4">
      {!isLoading && context && <ProfileCard driver={driver} profile={context.driver_profile} />}

      <Card className="p-0 overflow-hidden">
        <MenuRow icon="information-circle-outline" label="Giới thiệu" onPress={() => router.push('/about')} />
        <View className="h-px bg-gray-100" />
        <MenuRow icon="help-circle-outline" label="Câu hỏi thường gặp" onPress={() => router.push('/faq')} />
      </Card>

      <View className="mt-2">
        <Button label="Log Out" variant="outline" onPress={() => logout()} full />
      </View>
    </ScrollView>
  )
}

function MenuRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} className="flex-row items-center justify-between px-4 py-3.5">
      <View className="flex-row items-center gap-3">
        <Ionicons name={icon} size={20} color="#6b7280" />
        <Text className="text-gray-900 font-medium">{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
    </TouchableOpacity>
  )
}
