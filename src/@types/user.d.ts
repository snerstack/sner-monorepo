interface User {
  id: number
  username: string
  roles: string[]
  email?: string | null
  isAuthenticated: boolean
}
