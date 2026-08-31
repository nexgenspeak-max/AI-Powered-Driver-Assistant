import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Box, Collapse, List, ListItemButton, ListItemText } from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { opsService } from '../services/api/ops'
import { useOpsLocale } from '../i18n/useOpsLocale'
import { PALETTE } from '../styles/palette'
import { buildVoiceTree, expandedIdsForHref, hrefMatches, type VoiceTreeNode } from './voiceTree'

function TreeRow({
  node,
  depth,
  expanded,
  onToggle,
  onNavigate,
  pathname,
  search,
}: {
  node: VoiceTreeNode
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
  onNavigate: () => void
  pathname: string
  search: string
}) {
  const kids = node.children ?? []
  const hasKids = kids.length > 0
  const open = expanded.has(node.id)
  const selected = Boolean(node.to && hrefMatches(node.to, pathname, search))
  const rowSx = {
    borderRadius: 1,
    minHeight: 40,
    py: 0.75,
    pl: 1 + depth * 2,
    pr: 1,
    mb: 0.25,
    color: selected ? PALETTE.pale : PALETTE.shellText,
    bgcolor: selected ? PALETTE.shellNavActive : 'transparent',
    '&:hover': { bgcolor: selected ? PALETTE.shellNavActive : PALETTE.shellNavHover },
    '&.Mui-selected:hover': { bgcolor: PALETTE.shellNavActive },
  } as const

  const chevron = (
    <Box
      sx={{
        width: 18,
        height: 18,
        mr: 0.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: PALETTE.shellMuted,
      }}
    >
      {hasKids ? (
        <ChevronRightIcon
          sx={{
            fontSize: 18,
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        />
      ) : null}
    </Box>
  )

  const label = (
    <ListItemText
      primary={node.label}
      secondary={depth === 0 ? node.secondary : undefined}
      slotProps={{
        primary: {
          noWrap: true,
          sx: { fontSize: depth === 0 ? 14 : 13, fontWeight: selected || depth === 0 ? 600 : 400 },
        },
        secondary: { sx: { fontSize: 11, color: PALETTE.shellMuted } },
      }}
    />
  )

  const row = hasKids ? (
    <ListItemButton onClick={() => onToggle(node.id)} selected={selected} sx={rowSx}>
      {chevron}
      {label}
    </ListItemButton>
  ) : (
    <ListItemButton component={Link} to={node.to ?? '#'} onClick={onNavigate} selected={selected} sx={rowSx}>
      {chevron}
      {label}
    </ListItemButton>
  )

  return (
    <>
      {row}
      {hasKids ? (
        <Collapse in={open} timeout="auto" unmountOnExit={false}>
          <List dense disablePadding>
            {kids.map(child => (
              <TreeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
                onNavigate={onNavigate}
                pathname={pathname}
                search={search}
              />
            ))}
          </List>
        </Collapse>
      ) : null}
    </>
  )
}

export function VoiceTreeNav({ onNavigate }: { onNavigate: () => void }) {
  const { pathname, search } = useLocation()
  const { t } = useOpsLocale()
  const agentQ = useQuery({ queryKey: ['ops-agent'], queryFn: opsService.agent, refetchInterval: 12_000 })
  const promptsQ = useQuery({ queryKey: ['ops-prompts'], queryFn: opsService.prompts, refetchInterval: 12_000 })

  const items = useMemo(
    () => buildVoiceTree(agentQ.data?.locales ?? [], agentQ.data?.tools ?? [], promptsQ.data?.prompts ?? [], t),
    [agentQ.data, promptsQ.data, t],
  )

  const autoOpen = useMemo(
    () => new Set(expandedIdsForHref(items, pathname, search)),
    [items, pathname, search],
  )
  const [extraOpen, setExtraOpen] = useState<Set<string>>(() => new Set())
  const [forcedClosed, setForcedClosed] = useState<Set<string>>(() => new Set())

  const expanded = useMemo(() => {
    const next = new Set([...autoOpen, ...extraOpen])
    for (const id of forcedClosed) {
      next.delete(id)
    }
    return next
  }, [autoOpen, extraOpen, forcedClosed])

  const onToggle = (id: string) => {
    if (expanded.has(id)) {
      setForcedClosed(prev => new Set(prev).add(id))
      setExtraOpen(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      return
    }
    setExtraOpen(prev => new Set(prev).add(id))
    setForcedClosed(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  return (
    <List dense disablePadding>
      {items.map(node => (
        <TreeRow
          key={node.id}
          node={node}
          depth={0}
          expanded={expanded}
          onToggle={onToggle}
          onNavigate={onNavigate}
          pathname={pathname}
          search={search}
        />
      ))}
    </List>
  )
}
