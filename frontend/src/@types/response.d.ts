interface StorageHostLookupResponse {
  url: string
}

interface ServerErrorResponse {
  error: {
    code: number
    message: string
  }
}

type SmorestErrorMessages = string[]

interface SmorestFieldErrors {
  [field: string]: SmorestErrorMessages
}

interface SmorestErrorResponse {
  code: number
  status: string
  message?: string
  // this refers to marshmallow-code/webargs (aka smorest) errors emmited structure
  // errors are alwars namespaced as json/forms/querystring/...
  errors?: { [location: string]: SmorestErrorMessages | SmorestFieldErrors }
}

type SnerErrorResponse = ServerErrorResponse | SmorestErrorResponse
