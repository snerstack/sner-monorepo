import { describe, expect, it } from 'vitest'

import { getUrlForRef } from '@/lib/storage'

describe('storage lib helpers', () => {
    it('parses vuln.ref string', () => {
        expect(getUrlForRef("URL-https://dummy")).toBe("https://dummy")
        expect(getUrlForRef("URL-javascript")).toBe("#invalidurl#javascript")
    })
})