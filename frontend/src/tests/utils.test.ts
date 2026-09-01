import { describe, expect, it } from 'vitest'

import { linesToArray } from '@/utils'

describe('linesToArray', () => {
  it('splits a newline separated list into an array', () => {
    expect(linesToArray('one\ntwo\nthree')).toEqual(['one', 'two', 'three'])
  })

  it('trims whitespace from each line', () => {
    expect(linesToArray('  one  \n\ttwo\t\n three ')).toEqual(['one', 'two', 'three'])
  })

  it('filters out empty lines', () => {
    expect(linesToArray('one\n\n   \n\ntwo')).toEqual(['one', 'two'])
  })

  it('returns an empty array for empty input', () => {
    expect(linesToArray('')).toEqual([])
  })
})
