import { describe, expect, it } from 'vitest'

import { defaultAppConfig } from '@/appConfig'
import { LSKEY_TAG_COLORS, tagsConfigInitialize } from '@/lib/tags'

describe('localstorage lib helpers', () => {
    it('initializes local storage config tag colors', () => {
        // cleanup existing state from beforeEach
        localStorage.removeItem(LSKEY_TAG_COLORS)

        tagsConfigInitialize(defaultAppConfig)
        expect(localStorage.getItem(LSKEY_TAG_COLORS))
    })
})