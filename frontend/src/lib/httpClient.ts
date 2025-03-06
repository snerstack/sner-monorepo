import axios from "axios"
import { toast } from "react-toastify"

export const csrfTokenHeaderName = "X-CSRF-TOKEN"

export const handleHttpClientError = (err: unknown) => {
  if (axios.isAxiosError(err) && err.response?.data?.error) {
    const { message, errors } = err.response.data.error

    if (message) toast.error(message)

    if (errors) {
      Object.entries(errors).forEach(([field, messages]) => {
        (Array.isArray(messages) ? messages : [messages]).forEach(msg =>
          toast.error(`${field}: ${msg}`)
        )
      })
    }
  } else {
    toast.error("An unexpected error occurred.")
  }
}

const instance = axios.create({
  xsrfCookieName: "tokencsrf",
  xsrfHeaderName: csrfTokenHeaderName,
  withCredentials: true
})

export default instance
