import { Suspense, lazy } from 'react'
import { Box } from '@mui/material'

const AssistantCanvas = lazy(() => import('./AssistantCanvas'))

/**
 * Lazily mounts the three.js scene so the ~35MB avatar model/textures only
 * download once the homepage actually renders this section, not on first paint.
 */
export default function AssistantScene() {
  return (
    <Box sx={{ position: 'absolute', inset: 0 }}>
      <Suspense fallback={<Box sx={{ width: '100%', height: '100%', bgcolor: '#0d1117' }} />}>
        <AssistantCanvas />
      </Suspense>
    </Box>
  )
}
