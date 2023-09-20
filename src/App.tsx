import { routes } from './routes'
import env from 'app-env'
import { useEffect, useState } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { useRecoilState } from 'recoil'

import { userState } from '@/atoms/userAtom'

import httpClient from '@/lib/httpClient'

export default function App() {
  const [, setUser] = useRecoilState(userState)
  const [isChecking, setIsChecking] = useState<boolean>(true)

  const authHandler = () => {
    httpClient
      .get<User>(env.VITE_SERVER_URL + '/auth/user/@me')
      .then((resp) => {
        setUser({ ...resp.data, isAuthenticated: true })
        setIsChecking(false)
      })
      .catch(() => {
        setIsChecking(false)
      })
  }

  useEffect(() => {
    authHandler()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isChecking) return <></>

  const router = createBrowserRouter(routes)

  return <RouterProvider router={router} />
}
