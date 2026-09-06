import axios from 'axios'
import { toast } from 'react-toastify'

const csrfTokenHeaderName = 'X-CSRF-TOKEN'

const handleServerErrorResponse = (data: SnerErrorResponse): boolean => {
  if ('error' in data && data.error?.message) {
    toast.error(data.error.message)
    return true
  }

  return false
}

const handleSmorestValidationError = (data: SnerErrorResponse): boolean => {
  if ('errors' in data && data.errors) {
    Object.values(data.errors).forEach((locationError) => {
      // handle SmorestErrorMessages
      if (Array.isArray(locationError)) {
        locationError.forEach((msg) => toast.error(msg))
        return
      }

      // handle SmorestFieldErrors
      Object.entries(locationError).forEach(([field, messages]) => {
        messages.forEach((msg) => toast.error(`"${field}" field error: ${msg}`))
      })
    })

    return true
  }

  return false
}

const handleHttpClientError = (err: unknown) => {
  // do not pollute vitest console
  /* c8 ignore next 1 */
  if (!('vitest' in globalThis)) console.error(err)

  if (axios.isAxiosError<SnerErrorResponse>(err) && err.response?.data) {
    if (handleServerErrorResponse(err.response.data)) return
    if (handleSmorestValidationError(err.response.data)) return
  }

  toast.error('An unexpected error occurred.')
}

const httpClient = axios.create({
  xsrfCookieName: 'tokencsrf',
  xsrfHeaderName: csrfTokenHeaderName,
  withCredentials: true,
})

export { httpClient, handleHttpClientError, csrfTokenHeaderName }
