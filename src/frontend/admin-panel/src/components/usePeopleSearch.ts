import { useMemo, useState } from 'react'

const RANK: Record<string, number> = { online: 0, offline: 1, locked: 2 }

/** Search by name/phone and list online people first. */
export function usePeopleSearch<T extends { name: string; phone: string; status: string }>(rows: T[]) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter(r => !q || `${r.name} ${r.phone}`.toLowerCase().includes(q))
      .sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9) || a.name.localeCompare(b.name))
  }, [rows, query])
  return { query, setQuery, filtered }
}
