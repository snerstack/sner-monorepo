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
  active: boolean
  api_networks: string[]
  email: string | null
  roles: string[]
  username: string
}

interface Profile {
  api_networks: string[]
  has_apikey: boolean
  email: string
  username: string
  has_totp: boolean
  webauthn_credentials: string[]
}
