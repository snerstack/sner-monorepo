import { toast } from 'react-toastify'

import { getTableApi } from '@/lib/DataTables'
import httpClient from '@/lib/httpClient'

const RepeatButton = ({ url, tableId }: { url: string; tableId: string }) => {
  return (
    <a
      data-testid="repeat-btn"
      className="btn btn-outline-secondary"
      title="Repeat job"
      onClick={(e) => {
        e.preventDefault()
        httpClient
          .post<{ message: string }>(url)
          .then((data) => {
            toast.success(data.data.message)
            getTableApi(tableId).draw()
          })
          .catch(() => toast.error('Error while repeating a row.'))
      }}
    >
      Repeat
    </a>
  )
}
export default RepeatButton
