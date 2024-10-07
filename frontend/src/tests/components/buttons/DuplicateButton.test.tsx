import { describe, expect, it, Mock, vi } from "vitest"
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from "@/tests/utils/renderWithProviders"
import DuplicateButton from "@/components/buttons/DuplicateButton"
import httpClient from "@/lib/httpClient"

const useNavigateMock: Mock = vi.fn()
const mockNavigate = () => {
  vi.mock('react-router-dom', async (): Promise<unknown> => {
    const actual: Record<string, unknown> = await vi.importActual('react-router-dom')
    return {
      ...actual,
      useNavigate: (): Mock => useNavigateMock,
    }
  })
}

describe('Duplicate vuln button', () => {
    it('duplicates vuln and redirects to new item', async () => {
        mockNavigate()
        const duplicateRouteMock = vi.spyOn(httpClient, 'post').mockResolvedValue({data: {new_id: 4}})

        renderWithProviders({ element: <DuplicateButton url="/backend/storage/vuln/duplicate/3" />, path: "/storage/vuln/view/3" })
        fireEvent.click(screen.getByTestId('duplicate-btn'))

        await waitFor(() => {
            expect(duplicateRouteMock).toBeCalled()
            expect(useNavigateMock).toBeCalled()
        })
    })
})