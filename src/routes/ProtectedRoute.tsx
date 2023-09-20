import { Navigate, Outlet } from 'react-router-dom'
import { useRecoilValue } from 'recoil'

import { userState } from '@/atoms/userAtom'

const ProtectedRoute = ({ requiredRole }: { requiredRole: string }) => {
  const user = useRecoilValue(userState)

  if (!user.isAuthenticated) return <Navigate to="/auth/login" />

  if (!user.roles.includes(requiredRole)) return <Navigate to="/forbidden" />

  return <Outlet />
}
export default ProtectedRoute
