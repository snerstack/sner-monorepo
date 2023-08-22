import axios from 'axios'

export const getCSRFToken = async (): Promise<string> => {
  const csrfToken = await axios.post(import.meta.env.VITE_SERVER_URL + '/csrf')

  return csrfToken.data['csrf_token']
}

export default axios.create({ withCredentials: true })
