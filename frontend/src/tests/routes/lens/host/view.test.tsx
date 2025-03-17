import LensHostViewPage from "@/routes/lens/host/view"
import { screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/tests/utils/renderWithProviders"

const loader = () =>
  Promise.resolve({
    id: 1,
    address: "127.4.4.4",
    hostname: "testhost.testdomain.test<script>alert(1);</script>",
    os: "Test Linux 1",

    tags: ["reviewed"],
    comment: "no comment",
    created: "Mon, 17 Jul 2023 20:01:09 GMT",
    modified: "Fri, 01 Sep 2023 12:01:37 GMT",
    rescan_time: "Mon, 17 Jul 2023 20:01:09 GMT",

    services: [
      {
        id: 20,
        port: 21,
        proto: "tcp",
        state: "open:testing",
        info: "testing service info",

        tags: ["testtesg1", "testtag2"],
        comment: "testing commend",

        _notes_ids: [30],
        _vulns_ids: []
      }
    ],
    notes: [
      {
        id: 30,
        host_id: 1,
        service_id: 20,
        xtype: "xtype.testing",
        data: "testing data",

        tags: [],
        comment: "",
      }
    ],
    vulns: []
  })

describe("Lens host view page", () => {
  it("shows page", async () => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => { })

    renderWithProviders({
      element: <LensHostViewPage />,
      path: "/lens/host/view/1",
      loader: loader,
    })

    await waitFor(() => {
      expect(screen.getByText("Host Info")).toBeInTheDocument()
      const hostInfoElement = screen.getByTestId("lens-host-hostinfo")
      expect(within(hostInfoElement).getByText("127.4.4.4")).toBeInTheDocument();
      expect(within(hostInfoElement).getByText("Test Linux 1")).toBeInTheDocument()
    })

  })
})
