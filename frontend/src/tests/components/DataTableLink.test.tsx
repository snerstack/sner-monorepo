import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import DataTableLink from "@/components/DataTableLink";

describe("DataTableLink component", () => {
    it("renders children correctly", () => {
        const navigateMock = vi.fn()
        render(<DataTableLink url="/test" navigate={navigateMock}>link</DataTableLink>)
        expect(screen.getByText("link")).toBeInTheDocument()
    })

    it("calls navigate function on click", async () => {
        const navigateMock = vi.fn()
        render(<DataTableLink url="/test" navigate={navigateMock}>link</DataTableLink>)

        await userEvent.click(screen.getByText("link"))
        expect(navigateMock).toHaveBeenCalledWith("/test")
    })
})
