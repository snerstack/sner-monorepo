interface StorageHostLookupResponse {
  url: string
}

interface CustomErrorResponse {
  apiVersion: string
  error: {
    code: number
    message: string
  }
}
interface SmorestErrorResponse {
  code: number
  status: string
  message?: string
  errors?: Record<string, Record<string, string | string[]>>
}

type BackendErrorResponse = CustomErrorResponse | SmorestErrorResponse
