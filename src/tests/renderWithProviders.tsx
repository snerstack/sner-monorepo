import { render } from '@testing-library/react'
import { ReactElement } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { LoaderFunction, RouterProvider, createMemoryRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { RecoilRoot } from 'recoil'

export function renderWithProviders({
  element,
  path,
  loader,
  routes = [],
}: {
  element: ReactElement
  path: string
  loader?: LoaderFunction
  routes?: { element: ReactElement; path: string }[]
}) {
  const router = createMemoryRouter(
    [
      {
        element,
        path,
        loader,
      },
      ...routes,
    ],
    {
      initialEntries: [path],
      initialIndex: 1,
    },
  )

  return render(
    <RecoilRoot>
      <HelmetProvider>
        <RouterProvider router={router} />
        <ToastContainer />
      </HelmetProvider>
    </RecoilRoot>,
  )
}
