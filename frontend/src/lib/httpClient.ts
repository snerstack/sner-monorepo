import axios from 'axios'
import { toast } from 'react-toastify'

const csrfTokenHeaderName = 'X-CSRF-TOKEN'

const toastFieldErrors = (errors: Record<string, string | string[]>) => {
  Object.entries(errors).forEach(([field, messages]) => {
    const msgArray = Array.isArray(messages) ? messages : [messages]

    msgArray.forEach((msg) => {
      if (typeof msg === 'string') {
        toast.error(`"${field}" field error: ${msg}`)
      }
    })
  })
}

const handleCustomError = (data: BackendErrorResponse): boolean => {
  if (!('error' in data) || !data.error) return false

  const { message } = data.error

  if (message) toast.error(message)

  return true
}

const handleSmorestValidationError = (data: BackendErrorResponse): boolean => {
  if (!('code' in data) || data.code !== 422 || !data.errors) return false

  Object.values(data.errors).forEach((fieldErrors) => {
    toastFieldErrors(fieldErrors)
  })

  return true
}

const handleHttpClientError = (err: unknown) => {
  // do not pollute vitest console
  /* c8 ignore next 1 */
  if (!('vitest' in globalThis)) console.error(err)

  if (axios.isAxiosError<BackendErrorResponse>(err) && err.response?.data) {
    const data = err.response.data

    if (handleCustomError(data)) return
    if (handleSmorestValidationError(data)) return
  }

  toast.error('An unexpected error occurred.')
}

const httpClient = axios.create({
  xsrfCookieName: 'tokencsrf',
  xsrfHeaderName: csrfTokenHeaderName,
  withCredentials: true,
})

export { httpClient, handleHttpClientError, csrfTokenHeaderName }
