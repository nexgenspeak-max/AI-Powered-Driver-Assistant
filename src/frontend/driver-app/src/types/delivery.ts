// Matches trip-service's deliveryOrderService.ts DeliveryOrderStatus exactly
// — pending -> picked_up -> delivering -> delivered, delivering can fork to
// redelivery (failed attempt) or returned, redelivery can retry (delivering)
// or give up (returned).
export type DeliveryOrderStatus =
  | 'pending'
  | 'picked_up'
  | 'delivering'
  | 'delivered'
  | 'redelivery'
  | 'returned'

// Mirrors trip-service's DeliveryOrder response shape — no photo_uri: the
// backend never stores the driver's photo (only reads it transiently for
// the AI scan), so a persisted order never carries one.
export interface DeliveryOrder {
  order_id: string
  driver_phone: string
  status: DeliveryOrderStatus
  sender_phone: string
  sender_address?: string
  recipient_name?: string
  recipient_phone: string
  recipient_address: string
  note?: string
  source: 'ai_scan' | 'manual'
  created_at: string
  updated_at: string
}

// What POST /delivery-orders/scan hands back after the AI reads a driver's
// photo — null per field it couldn't read, never a guess.
export interface ExtractedDeliveryInfo {
  sender_phone: string | null
  sender_address: string | null
  recipient_name: string | null
  recipient_phone: string | null
  recipient_address: string | null
  note: string | null
}
