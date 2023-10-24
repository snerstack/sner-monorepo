import { toast } from 'react-toastify'

import { getTableApi } from '@/lib/DataTables'
import httpClient from '@/lib/httpClient'

const DeleteButton = ({ url, tableId }: { url: string; tableId?: string }) => {
  return (
    <a
      data-testid="delete-btn"
      className="btn btn-outline-secondary"
      href={url}
      onClick={(e) => {
        e.preventDefault()
        httpClient
          .post(import.meta.env.VITE_SERVER_URL + url)
          .then(() => {
            if (tableId) {
              getTableApi(tableId).draw()
            } else {
              window.location.reload()
            }
          })
          .catch(() => toast.error('Error while deleting a row.'))
      }}
    >
      <i className="fas fa-trash text-danger"></i>
    </a>
  )
}
export default DeleteButton
