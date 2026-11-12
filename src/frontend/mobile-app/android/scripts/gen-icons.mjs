import { GLYPHS } from './glyphs.ts'
const kname = k => k.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('').replace(/^(\d)/, '_$1')
let out = `// GENERATED from driver-app/src/components/icons/glyphs.ts — do not edit by hand.
package com.chinhtruongba.driverapp.designsystem.icons

internal sealed interface GlyphPart {
    val body: Boolean
}

internal data class PathPart(
    val d: String,
    override val body: Boolean = false,
    val solid: Boolean = false,
    val evenOdd: Boolean = false,
) : GlyphPart

internal data class CirclePart(
    val cx: Float,
    val cy: Float,
    val r: Float,
    override val body: Boolean = false,
    val dot: Boolean = false,
) : GlyphPart

enum class CzenIcon(internal val parts: List<GlyphPart>) {
`
const f = n => (Number.isInteger(n) ? n + '.0' : String(n)) + 'f'
const entries = Object.entries(GLYPHS).map(([k, parts]) => {
  const ps = parts.map(p => {
    if ('d' in p) {
      const a = [JSON.stringify(p.d)]
      if (p.body) a.push('body = true'); if (p.solid) a.push('solid = true'); if (p.evenodd) a.push('evenOdd = true')
      return `PathPart(${a.join(', ')})`
    }
    const a = [f(p.cx), f(p.cy), f(p.r)]
    if (p.body) a.push('body = true'); if (p.dot) a.push('dot = true')
    return `CirclePart(${a.join(', ')})`
  })
  return `    ${kname(k)}(\n        listOf(\n${ps.map(s => '            ' + s + ',').join('\n')}\n        ),\n    )`
})
out += entries.join(',\n') + ',\n}\n'
process.stdout.write(out)
