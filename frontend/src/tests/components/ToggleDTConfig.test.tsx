import { fireEvent, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { renderWithProviders } from "../utils/renderWithProviders"

import ToggleDTConfig from "@/components/ToggleDTConfig"
import { getDTConfigValue } from "@/lib/sner/storage"

describe("ToggleDTConfig component", () => {
    it("renders", async () => {
        renderWithProviders({ element: <ToggleDTConfig storageKey="dummy" caption="dummy" />, path: "/" })

        await waitFor(() => {
            fireEvent.click(screen.getByTestId("toggle-dtconfig-button"))
            expect(getDTConfigValue("dummy")).toBeTruthy()
        })

        await waitFor(() => {
            fireEvent.click(screen.getByTestId("toggle-dtconfig-button"))
            expect(getDTConfigValue("dummy")).toBeFalsy()
        })
    })
})
