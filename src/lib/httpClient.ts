import axios from 'axios'

export const getCSRFToken = async (): Promise<string> => {
  const csrfToken = await axios.get('http://localhost:18000/csrf')
}

export default axios.create({ withCredentials: true })
