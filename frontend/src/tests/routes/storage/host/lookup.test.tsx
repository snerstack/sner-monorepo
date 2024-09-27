import { describe, expect, it, vi } from "vitest"
import { screen, waitFor } from '@testing-library/react'
import { URLSearchParams } from "url"

import HostLookupPage from "@/routes/storage/host/lookup"

import { renderWithProviders } from "@/tests/utils/renderWithProviders"

const mockedUseNavigate = vi.fn()

describe('Host lookup page', () => {
    it('looks up host and navigates to url returned by backend', async () => {
        // useSearchParams can be mocked with spyOn, but useNavigate cannot, hence full module mock here
        // also URLSearchParams import must be explicit otherwise mock does not work
        vi.mock("react-router-dom", async () => {
            const mod = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
            return {
                ...mod,
                useNavigate: () => mockedUseNavigate,
                useSearchParams: (): [URLSearchParams, () => void] => [new URLSearchParams("?hostname=dummy2"), vi.fn()]
            }
        })

        renderWithProviders({ element: <HostLookupPage />, path: '/storage/host/lookup' })

        expect(screen.getByText(/Lookup/i)).toBeInTheDocument()
        await waitFor(() => expect(mockedUseNavigate).toBeCalled())
    })
})