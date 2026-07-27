export interface DeliveryOrder {
  id: string
  sender_phone: string
  sender_address?: string
  recipient_phone: string
  recipient_address: string
  note?: string
  photo_uri?: string
  created_at: string
}
