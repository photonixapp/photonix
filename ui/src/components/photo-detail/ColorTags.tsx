import type { ColorTag } from '../../lib/photos/detail-types'

interface ColorTagsProps {
  tags: ColorTag[]
}

// Custom color map matching the original Photonix color classifier values
// These differ from CSS named colors (e.g., CSS "azure" is #f0ffff, almost white)
const COLOR_MAP: Record<string, string> = {
  red: 'rgb(229, 36, 36)',
  orange: 'rgb(245, 133, 0)',
  amber: 'rgb(234, 166, 30)',
  yellow: 'rgb(240, 240, 39)',
  lime: 'rgb(168, 228, 26)',
  green: 'rgb(7, 215, 7)',
  teal: 'rgb(16, 202, 155)',
  turquoise: 'rgb(25, 225, 225)',
  aqua: 'rgb(10, 188, 245)',
  azure: 'rgb(30, 83, 249)',
  blue: 'rgb(0, 0, 255)',
  purple: 'rgb(127, 0, 255)',
  orchid: 'rgb(190, 0, 255)',
  magenta: 'rgb(233, 8, 200)',
  white: 'rgb(255, 255, 255)',
  gray: 'rgb(124, 124, 124)',
  black: 'rgb(0, 0, 0)',
}

function getColorValue(name: string): string {
  const key = name.toLowerCase().replace(/ /g, '')
  return COLOR_MAP[key] || name.toLowerCase()
}

export function ColorTags({ tags }: ColorTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((ct, i) => {
        const title = ct.significance
          ? `${ct.tag.name} (${Math.round(ct.significance * 1000) / 1000})`
          : ct.tag.name

        return (
          <div
            key={i}
            className="w-6 h-6 rounded border border-white/20"
            style={{
              backgroundColor: getColorValue(ct.tag.name),
            }}
            title={title}
          />
        )
      })}
    </div>
  )
}
