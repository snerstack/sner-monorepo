import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { renderWithProviders } from "../utils/renderWithProviders"

import EllipsisCell from "@/components/EllipsisCell"

describe("EllipsisCell component", () => {
    it("renders long content shortened", () => {
        renderWithProviders({ element: <EllipsisCell data={"A".repeat(2040) + "dummyxxxx"} />, path: "/" })

        expect(screen.getByText(/dumm.../)).toBeInTheDocument()
    })
})
