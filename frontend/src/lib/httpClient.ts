import axios from 'axios'
import { toast } from 'react-toastify'

const csrfTokenHeaderName = 'X-CSRF-TOKEN'

const handleHttpClientError = (descr: string, err: unknown) => {
  console.error(descr, err)

  if (axios.isAxiosError<BackendErrorResponse>(err) && err.response?.data?.error) {
    const { message, errors } = err.response.data.error

    if (message) toast.error(`${descr}, ${message}`)

    if (errors) {
      Object.entries(errors).forEach(([field, messages]) => {
        (Array.isArray(messages) ? messages : [messages]).forEach((msg) => {
          if (typeof msg === 'string') {
            toast.error(`${field}: ${msg}`)
          }
        })
      })
    }
  } else {
    toast.error('An unexpected error occurred.')
  }
}

const httpClient = axios.create({
  xsrfCookieName: 'tokencsrf',
  xsrfHeaderName: csrfTokenHeaderName,
  withCredentials: true
})

export { httpClient, handleHttpClientError, csrfTokenHeaderName }
