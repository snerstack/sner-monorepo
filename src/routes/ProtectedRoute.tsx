import { Navigate, Outlet } from 'react-router-dom'

const ProtectedRoute = ({ authenticated, authorized }: { authenticated: boolean; authorized: boolean }) => {
  if (!authenticated) return <Navigate to="/auth/login" />

  if (!authorized) return <Navigate to="/forbidden" />

  return <Outlet />
}
export default ProtectedRoute
