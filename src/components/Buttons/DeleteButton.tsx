import env from 'app-env'

import httpClient from '@/lib/httpClient'

const DeleteButton = ({ url }: { url: string }) => {
  return (
    <a
      className="btn btn-outline-secondary"
      href={url}
      onClick={(e) => {
        e.preventDefault()
        httpClient.post(env.VITE_SERVER_URL + url).then(() => window.location.reload())
      }}
    >
      <i className="fas fa-trash text-danger"></i>
    </a>
  )
}
export default DeleteButton
