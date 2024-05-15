import { config, Config } from '@/../config.ts'

export const LSKEY_TAG_COLORS: string = 'config_tag_colors';
const DEFAULT_COLOR: string = '#6c757d'

/* app state initializer */
export const tagsConfigInitialize = () => {
  if (!localStorage.getItem(LSKEY_TAG_COLORS)) {
    localStorage.setItem(LSKEY_TAG_COLORS, JSON.stringify(config.tags.colors))
  }
}

export const getColorForTag = (tag: string): string => {
  const tags = JSON.parse(localStorage.getItem(LSKEY_TAG_COLORS)!) as Config['tags']['colors']
  const matcher = tag.includes(':') ? tag.split(':')[0]+':' : tag
  return tags[matcher] || DEFAULT_COLOR
}
  
export const invertColor = (hex: string): string => {
  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1)
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }

  const r = parseInt(hex.slice(0, 2), 16),
    g = parseInt(hex.slice(2, 4), 16),
    b = parseInt(hex.slice(4, 6), 16)

  return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? '#000000' : '#FFFFFF'
}
