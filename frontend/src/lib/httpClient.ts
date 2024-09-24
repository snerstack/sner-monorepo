import axios from 'axios'
//import Cookies from 'js-cookie'

export const csrfTokenHeaderName = "X-CSRF-TOKEN"

const instance = axios.create({
  xsrfCookieName: "tokencsrf",
  xsrfHeaderName: csrfTokenHeaderName,
  withCredentials: true
})

export default instance
