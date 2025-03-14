import axios from 'axios'
import jQuery from 'jquery'
import { useEffect, useState } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { useRecoilState } from 'recoil'
import { routes } from './routes'

import { AppConfig } from '@/appConfig'
import { appConfigState } from '@/atoms/appConfigAtom'
import { userState } from '@/atoms/userAtom'
import { httpClient } from '@/lib/httpClient'
import { tagsConfigInitialize } from '@/lib/sner/tags'
import { urlFor } from '@/lib/urlHelper'

const App = () => {
  const [, setUser] = useRecoilState(userState)
  const [appConfig, setAppConfig] = useRecoilState(appConfigState)
  const [bootFinished, setBootFinished] = useState<boolean>(false)

  /**
   * Initializes the application state
   * Serialize all requests, app uses cookie session csrf tokens, paralel fetch
   * can mess the token handling?
   *
   * @async
   * @function bootApp
   * @returns {Promise<void>} A promise that resolves boot process is finished.
   */
  const bootApp = async (): Promise<void> => {
    try {
      // msw mock is missing for this route, but App.tsx test is also missing
      const configResp = await httpClient.get<AppConfig>(urlFor('/backend/frontend_config'))
      setAppConfig({ ...appConfig, ...configResp.data })
      tagsConfigInitialize(appConfig)
    } catch (error) {
      console.error('Boot config failed', error)
      return
    }

    try {
      const authResp = await httpClient.get<User>(urlFor('/backend/auth/user/me'))
      setUser({ ...authResp.data, isAuthenticated: true })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.info('User is not authenticated')
      } else {
        console.error('Auth request failed', error)
        return
      }
    }

    setBootFinished(true)
  }

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.jQuery = jQuery // helper for selenium tests

    void bootApp()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!bootFinished) return <>booting</>

  const router = createBrowserRouter(routes)

  return <RouterProvider router={router} />
}

export default App
