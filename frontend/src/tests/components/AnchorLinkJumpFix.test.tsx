import { render } from "@testing-library/react"
import { useLocation } from "react-router-dom"
import { beforeEach, describe, expect, it, Mock, vi } from "vitest"

import AnchorLinkJumpFix from "@/components/AnchorLinkJumpFix"

describe("AnchorLinkJumpFix", () => {

    beforeEach(() => {
        vi.spyOn(window, "scrollTo").mockImplementation(() => { })
        vi.mock("react-router-dom", () => ({
            useLocation: vi.fn(),
        }))
    })

    it("scrolls to top when no anchor is in URL", () => {
        (useLocation as Mock).mockReturnValue({ hash: "" })

        render(<AnchorLinkJumpFix />)

        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 })
    })

    it("scrolls to anchor if present in URL", () => {
        (useLocation as Mock).mockReturnValue({ hash: "#target" })

        const targetElement = document.createElement("div")
        targetElement.id = "target"
        targetElement.getBoundingClientRect = vi.fn(() => new DOMRect(0, 11, 0, 0))
        document.body.appendChild(targetElement)

        render(<><div className="navbar dummy"></div><AnchorLinkJumpFix /></>)

        expect(window.scrollTo).toHaveBeenCalledWith({ top: 11 })
    })

    it("observes for dynamically added anchors", () => {
        (useLocation as Mock).mockReturnValue({ hash: "#dynamic" })

        let observerMock: MutationObserver | null = null
        let observerMockCallback: MutationCallback | null = null
        vi.stubGlobal("MutationObserver", class {
            constructor(cb: MutationCallback) {
                // eslint-disable-next-line @typescript-eslint/no-this-alias
                observerMock = this
                observerMockCallback = cb
            }
            observe = vi.fn()
            disconnect = vi.fn()
            takeRecords = vi.fn()
        })

        render(<AnchorLinkJumpFix />)

        // Simulate dynamic content addition
        const dynamicElement = document.createElement("div")
        dynamicElement.id = "dynamic"
        document.body.appendChild(dynamicElement)

        // Trigger mocked observer
        observerMockCallback!([], observerMock!)

        expect(window.scrollTo).toHaveBeenCalled()
    })
})
