/**
 * Handles scrolling to anchor links while considering a fixed-top navbar.
 * 
 * In React with Bootstrap 4, using a "fixed-top navbar" causes issues when navigating to anchor links (`#id`).
 * - The browser's default anchor scrolling does not account for the fixed navbar height, leading to incorrect positioning.
 * - CSS solutions like `scroll-padding-top` or `::before` do not work reliably due to React's dynamic rendering.
 * 
 * This component listens for location changes and manually adjusts scrolling:
 * - Ensures that navigating to an anchor properly offsets the scroll position for the navbar.
 * - Supports dynamically loaded content by observing the DOM for new elements.
 * - Listens for back/forward navigation (popstate) to maintain expected behavior.
 *
 * ## Usage
 * - Use component on page which is required to do proper scrolling.
 * - Internal Links (Same Page): Use `<Link to="#xxx">` instead of `<a href="#xxx">` to ensure proper behavior.
 * - External Links (Other Pages): `<a href="some-page#xxx">` can be used, though behavior may depend on browser handling.
 */

import { useEffect } from "react"
import { useLocation } from "react-router-dom"

const AnchorLinkJumpFix = () => {
    const location = useLocation()

    useEffect(() => {
        let observer: MutationObserver | null = null

        /**
         * Attempts to find the target anchor and scroll to it, reset page scroll to
         * top if no hash in URL.
         * 
         * @returns {boolean} Whether the anchor was successfully found and scrolled to.
         */
        const attemptScroll = (): boolean => {
            if (!location.hash) {
                window.scrollTo({ top: 0 })
                return true
            }

            const target = document.querySelector(location.hash)
            if (target) {
                const navbar = document.querySelector(".navbar") as HTMLElement
                const navbarHeight = navbar ? navbar.offsetHeight * 1.2 : 0
                const offsetTop = target.getBoundingClientRect().top + window.scrollY - navbarHeight
                window.scrollTo({ top: offsetTop })
                return true
            }

            return false
        }

        // Try scrolling or observe for dynamically added elements
        if (!attemptScroll()) {
            observer = new MutationObserver((_mutations, obs) => {
                if (attemptScroll()) obs.disconnect()
            })
            observer.observe(document.body, { childList: true, subtree: true })
        }

        // Handle back/forward navigation (popstate event)
        /* c8 ignore next 1 */
        const onPopState = () => attemptScroll()
        window.addEventListener("popstate", onPopState)

        // Cleanup on effect re-run or unmount
        return () => {
            window.removeEventListener("popstate", onPopState)
            if (observer) observer.disconnect()
        }
    }, [location])

    return null
}

export default AnchorLinkJumpFix
