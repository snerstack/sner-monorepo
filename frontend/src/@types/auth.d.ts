interface UserListRow {
  id: number
  active: boolean
  apikey: boolean
  email: string | null
  roles: string[]
  username: string
}

interface UserEdit {
  id: number
  username: string
  email: string | null
  full_name: string | null
  active: boolean
  api_networks: string[]
  roles: string[]
}

interface Profile {
  username: string
  email: string
  full_name: string
  api_networks: string[]
  webauthn_credentials: string[]
  has_apikey: boolean
  has_totp: boolean
}
