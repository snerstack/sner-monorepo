import { describe, expect, it } from "vitest"
import { screen, waitFor } from "@testing-library/react"

import LensHostListPage from "@/routes/lens/host/list"

import { renderWithProviders } from "@/tests/utils/renderWithProviders"

describe("Lens host list page", () => {
  it("shows table of hosts", async () => {

    renderWithProviders({
      element: <LensHostListPage />,
      path: "/lens/host/list",
    })

    await waitFor(() => {
      expect(screen.getByTestId("heading")).toHaveTextContent("Hosts")

      expect(screen.getByText("127.3.5.6")).toBeInTheDocument()
      expect(screen.getByText("lens.hostname.test <XSS>")).toBeInTheDocument()
    })
  })
})
