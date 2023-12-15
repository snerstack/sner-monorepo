import { capitalize } from '@/utils'

import { getTableApi } from '@/lib/DataTables'
import { getSelectedIdsFormData, tagAction } from '@/lib/sner/storage'

const TagButton = ({
  tag,
  url,
  tableId,
  id,
  reloadPage,
}: {
  tag: string
  url: string
  tableId?: string
  id?: number
  reloadPage?: boolean
}) => {
  return (
    <a
      data-testid="tag-btn"
      className="btn btn-outline-secondary abutton_tag_multiid"
      href="#"
      title={`add tag ${tag}`}
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onClick={async (e) => {
        e.preventDefault()
        if (id) {
          await tagAction({ ids: { 'ids-0': id }, tag, url, action: 'set' })
        }

        if (tableId) {
          const ids = getSelectedIdsFormData(getTableApi(tableId))

          await tagAction({ ids, tag, url, action: 'set' })
          getTableApi(tableId).ajax.reload()
        }

        if (reloadPage) {
          window.location.reload()
        }
      }}
    >
      {capitalize(tag)}
    </a>
  )
}
export default TagButton
