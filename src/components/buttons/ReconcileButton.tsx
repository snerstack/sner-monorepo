import { toast } from 'react-toastify'

import { getTableApi } from '@/lib/DataTables'
import httpClient from '@/lib/httpClient'

const ReconcileButton = ({ url, tableId }: { url: string; tableId: string }) => {
  return (
    <a
      data-testid="reconcile-btn"
      className="btn btn-outline-secondary"
      title="Forcefail job and reclaim heatmap count"
      onClick={(e) => {
        e.preventDefault()
        httpClient
          .post<{ message: string }>(import.meta.env.VITE_SERVER_URL + url)
          .then((data) => {
            toast.success(data.data.message)
            getTableApi(tableId).draw()
          })
          .catch(() => toast.error('Error while reconciling a row.'))
      }}
    >
      Reconcile
    </a>
  )
}
export default ReconcileButton
