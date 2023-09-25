import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'

const DeleteButton = ({ url }: { url: string }) => {
  return (
    <a
      className="btn btn-outline-secondary"
      href={url}
      onClick={(e) => {
        e.preventDefault()
        httpClient
          .post(import.meta.env.VITE_SERVER_URL + url)
          .then(() => window.location.reload())
          .catch(() => toast.error('Error while deleting a row.'))
      }}
    >
      <i className="fas fa-trash text-danger"></i>
    </a>
  )
}
export default DeleteButton
