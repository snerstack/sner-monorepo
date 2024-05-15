import { describe, expect, it } from 'vitest'
import { LSKEY_TAG_COLORS, tagsConfigInitialize } from '@/lib/sner/tags'

describe('storage lib helpers', () => {
    it('initializes local storage config tag colors', () => {
        // cleanup existing state from beforeEach
        localStorage.removeItem(LSKEY_TAG_COLORS)

        tagsConfigInitialize()
        expect(localStorage.getItem(LSKEY_TAG_COLORS))
    })
})