import axios from 'axios'

axios.defaults.xsrfCookieName = 'XSRF-TOKEN'
axios.defaults.xsrfHeaderName = 'X-CSRF-TOKEN'

export default axios.create({ withCredentials: true })
