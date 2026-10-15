import { promises as fs } from 'fs';
import path from 'path';

export interface DirUsage {
  name: string;
  path: string;
  bytes: number | null;   // null = directory missing or unreadable
}

export interface DiskSnapshot {
  taken_at: string;
  volume_path: string;
  total_bytes: number;
  free_bytes: number;
  used_pct: number;
  dirs: DirUsage[];
}

/** Total size of regular files under dir (bounded walk; symlinks are not followed). */
export async function dirBytes(dir: string, maxEntries = 50_000): Promise<number | null> {
  let total = 0;
  let seen = 0;
  const walk = async (d: string): Promise<void> => {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      if (++seen > maxEntries) return;
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile()) total += (await fs.stat(p)).size;
    }
  };
  try {
    await walk(dir);
    return total;
  } catch {
    return null;
  }
}

/** Disk capacity of the volume holding the first dir, plus the size of each watched dir (AVDA-115). */
export async function diskSnapshot(dirs: Array<{ name: string; path: string }>): Promise<DiskSnapshot> {
  const volume = dirs.find(Boolean)?.path ?? '/';
  let probe = volume;
  // statfs needs an existing path; climb up until one exists.
  while (probe !== path.dirname(probe)) {
    try { await fs.access(probe); break; } catch { probe = path.dirname(probe); }
  }
  const st = await fs.statfs(probe);
  const total = st.blocks * st.bsize;
  const free = st.bavail * st.bsize;
  return {
    taken_at: new Date().toISOString(),
    volume_path: probe,
    total_bytes: total,
    free_bytes: free,
    used_pct: total ? Math.round(((total - free) / total) * 1000) / 10 : 0,
    dirs: await Promise.all(dirs.map(async d => ({ ...d, bytes: await dirBytes(d.path) }))),
  };
}
