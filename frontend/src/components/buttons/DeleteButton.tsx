import { toast } from 'react-toastify'

import { getTableApi } from '@/lib/DataTables'
import httpClient from '@/lib/httpClient'

const DeleteButton = ({ url, tableId, className }: { url: string; tableId?: string; className?: string }) => {
  return (
    <a
      data-testid="delete-btn"
      className={className ? className : 'btn btn-outline-secondary'}
      href={url}
      onClick={(e) => {
        e.preventDefault()

        if (!confirm('Really delete?')) return

        httpClient
          .post(url)
          .then(() => {
            /* c8 ignore next 2 */
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
