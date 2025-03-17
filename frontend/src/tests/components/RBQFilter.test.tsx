import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { MemoryRouter, URLSearchParamsInit } from "react-router-dom"
import * as reactrouterdom from "react-router-dom"

import RBQFilter from "@/components/RBQFilter"
import userEvent from "@testing-library/user-event";

describe("RBQFilterForm", () => {
    const mockFields = [
        { name: "name", label: "Name" },
        { name: "age", label: "Age" }
    ]

    it("renders the component", () => {
        render(
            <MemoryRouter>
                <RBQFilter fields={mockFields} />
            </MemoryRouter>
        )

        expect(screen.getByText("Filter")).toBeInTheDocument()
    })

    it("setSearchParams updated when Filter is applied", async () => {
        const searchParamsMock = new URLSearchParams("?jsonfilter=invalid{json")
        const setSearchParamsMock = (nextInit: URLSearchParamsInit | ((prev: URLSearchParams) => URLSearchParamsInit) | undefined) => {
            if (typeof nextInit === 'function') { return nextInit(searchParamsMock) }
            return nextInit
        }
        vi.spyOn(reactrouterdom, "useSearchParams").mockReturnValue([searchParamsMock, setSearchParamsMock])

        render(
            <MemoryRouter>
                <RBQFilter fields={mockFields} />
            </MemoryRouter>
        )

        fireEvent.click(screen.getByTestId("add-rule"))

        const editor = screen.getByTestId("value-editor")
        expect(editor).toBeInTheDocument()
        await userEvent.type(editor, "Hello, World!")
        expect(editor).toHaveValue("Hello, World!")

        fireEvent.click(screen.getByText("Filter"))
        expect(searchParamsMock.get("jsonfilter")).contain("rules")

        fireEvent.click(screen.getByText("Clear"))
        expect(searchParamsMock.get("jsonfilter")).toBeNull()
    })
})
