import * as Contacts from 'expo-contacts'

// Cap kept small on purpose — this list gets read out loud by the voice
// assistant one name at a time when the driver has to disambiguate ("có 2
// người tên Tuấn..."), so more than a handful would be unusable by ear, and
// it keeps the RPC response payload small.
const MAX_RESULTS = 5

export interface ContactMatch {
  name: string
  phone_number: string
}

// Permission requested lazily here, at the first actual search — not
// proactively when "Trợ lý rảnh tay" is turned on (requested at point of use).
async function ensurePermission(): Promise<boolean> {
  const existing = await Contacts.getPermissionsAsync()
  if (existing.granted) return true
  const requested = await Contacts.requestPermissionsAsync()
  return requested.granted
}

// Called from the LiveKit RPC handler in voiceSessionStore.ts — the backend
// voice agent has no access to the driver's phone contacts (they only exist
// on-device), so it asks the client to resolve a spoken name into a phone
// number via this search instead.
export async function searchContacts(query: string): Promise<ContactMatch[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const granted = await ensurePermission()
  if (!granted) {
    throw new Error('permission_denied')
  }

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers],
    name: trimmed,
  })

  const matches: ContactMatch[] = []
  for (const contact of data) {
    // Only the first number per contact — the confirmed product flow
    // disambiguates by *person* ("which Tuấn"), never by "which of Tuấn's
    // numbers", so exposing more than one per contact would just add
    // options nobody asked to choose between.
    const number = contact.phoneNumbers?.[0]?.number
    if (!contact.name || !number) continue
    matches.push({ name: contact.name, phone_number: number })
    if (matches.length >= MAX_RESULTS) break
  }
  return matches
}
