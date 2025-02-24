import { describe, expect, it } from "vitest"
import { screen, waitFor } from "@testing-library/react"

import LensVulnListPage from "@/routes/lens/vuln/list"

import { renderWithProviders } from "@/tests/utils/renderWithProviders"

describe("Lens vuln list page", () => {
  it("shows table of vulns", async () => {

    renderWithProviders({
      element: <LensVulnListPage />,
      path: "/lens/vuln/list",
    })

    await waitFor(() => {
      expect(screen.getByTestId("heading")).toHaveTextContent("Vulns")

      expect(screen.getByText("127.3.5.6")).toBeInTheDocument()
      expect(screen.getByText("dummy vuln name")).toBeInTheDocument()
    })
  })
})
