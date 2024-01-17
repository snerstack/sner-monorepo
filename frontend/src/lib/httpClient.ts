import axios from 'axios'
import Cookies from 'js-cookie'

const instance = axios.create({ withCredentials: true })

instance.interceptors.request.use((config) => {
  /* c8 ignore next 3 */
  config.headers['X-CSRF-TOKEN'] = Cookies.get('XSRF-TOKEN')
  return config
})

export default instance
