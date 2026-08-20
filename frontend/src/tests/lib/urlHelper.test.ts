import { describe, expect, it } from 'vitest'

import { urlFor } from '@/lib/urlHelper'

describe('urlFor', () => {
  it('returns the path unchanged when params are omitted', () => {
    expect(urlFor('/backend/x.json')).toBe('/backend/x.json')
  })

  it('produces no trailing "?" for empty params', () => {
    expect(urlFor('/backend/x.json', {})).toBe('/backend/x.json')
    expect(urlFor('/backend/x.json', new URLSearchParams())).toBe('/backend/x.json')
  })

  it('encodes a plain record with the sner-strict RFC3986 encoder', () => {
    expect(urlFor('/backend/x.json', { b: 'c', d: 'e f' })).toBe('/backend/x.json?b=c&d=e%20f')
  })

  it('strict-encodes quotes in filter expressions', () => {
    expect(urlFor('/backend/x.json', { filter: 'Host.id=="1"' })).toBe('/backend/x.json?filter=Host.id%3D%3D%221%22')
  })

  it('passes URLSearchParams through verbatim', () => {
    expect(urlFor('/backend/x.json', new URLSearchParams('x=1&y=2'))).toBe('/backend/x.json?x=1&y=2')
  })
})
