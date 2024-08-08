import jQuery from 'jquery'
import { useEffect, useState } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { useRecoilState } from 'recoil'
import { routes } from './routes'

import { AppConfig } from '@/appConfig'
import { appConfigState } from '@/atoms/appConfigAtom'
import { userState } from '@/atoms/userAtom'
import httpClient from '@/lib/httpClient'
import { tagsConfigInitialize } from '@/lib/sner/tags'
import { urlFor } from '@/lib/urlHelper'


const App = () => {
  const [, setUser] = useRecoilState(userState)
  const [isChecking, setIsChecking] = useState<boolean>(true)

  const [appConfig, setAppConfig] = useRecoilState(appConfigState)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const authHandler = () => {
    httpClient
      .get<User>(urlFor('/backend/auth/user/me'))
      .then((resp) => {
        setUser({ ...resp.data, isAuthenticated: true })
        setIsChecking(false)
      })
      .catch(() => {
        setIsChecking(false)
      })
  }

  const configHandler = () => {
    // there should be also msw mock for the route, but since App object it not currently tested, it is not needed
    httpClient
      .get<AppConfig>(urlFor('/frontend_config'))
      .then((resp) => {
        setAppConfig({ ...appConfig, ...resp.data })
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.jQuery = jQuery // helper for selenium tests
    authHandler()
    configHandler()
    tagsConfigInitialize(appConfig)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isChecking) return <></>
  if (isLoading) return <></>

  const router = createBrowserRouter(routes)

  return <RouterProvider router={router} />
}

export default App
