import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { default as DataTableLib } from "datatables.net-bs4"
import * as reactrouterdom from "react-router-dom"
import { MemoryRouter, URLSearchParamsInit } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import DataTable from "@/components/DataTable"
import RBQFilter from "@/components/RBQFilter"
import { Column } from "@/lib/DataTables"
import { toQueryString, urlFor } from "@/lib/urlHelper"

interface DataTableInstanceParams {
    draw: number
}

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

    it('applyFilter should reload DataTable if params remain the same', async () => {
        // wrap DT because of useSearchParams hook which cannot be used/passed otherwise from vitest
        const FilterableDataTable = () => {
            const [searchParams] = reactrouterdom.useSearchParams()
            const dtColumns = [Column('id'), Column('address')];
            return (
                <div>
                    <RBQFilter fields={mockFields} />
                    <DataTable
                        id="dummy_data_table"
                        columns={dtColumns}
                        ajax_url={urlFor(`/backend/lens/host/list.json${toQueryString(searchParams)}`)}
                    />
                </div>
            )
        }

        render(
            <MemoryRouter initialEntries={["?jsonfilter=%7B%22combinator%22%3A%22and%22%2C%22rules%22%3A%5B%5D%7D"]}>
                <FilterableDataTable />
            </MemoryRouter>
        )

        const dtinstance = new DataTableLib.Api(DataTableLib.tables()[0] as Node)

        await waitFor(() => {
            expect(screen.getByText("127.3.5.6")).toBeInTheDocument()

        })
        expect((dtinstance.ajax.params() as DataTableInstanceParams).draw).equals(1)

        fireEvent.click(screen.getByText("Filter"))
        await waitFor(() => {
            expect(screen.getByText("127.3.5.6")).toBeInTheDocument()
            expect((dtinstance.ajax.params() as DataTableInstanceParams).draw).equals(2)
        })
    })
})
