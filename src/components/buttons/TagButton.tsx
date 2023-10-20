import { capitalize } from '@/utils'

import { getTableApi } from '@/lib/DataTables'
import { getSelectedIdsFormData, tagAction } from '@/lib/sner/storage'

const TagButton = ({ tag, url, tableId, id }: { tag: string; url: string; tableId?: string; id?: number }) => {
  return (
    <a
      data-testid="tag-btn"
      className="btn btn-outline-secondary abutton_tag_multiid"
      href="#"
      title={`add tag ${tag}`}
      onClick={(e) => {
        e.preventDefault()
        if (id) {
          tagAction({ ids: { 'ids-0': id }, tag, url, action: 'set' })
        }

        if (tableId) {
          const ids = getSelectedIdsFormData(getTableApi(tableId))

          tagAction({ ids, tag, url, action: 'set' })
        }
      }}
    >
      {capitalize(tag)}
    </a>
  )
}
export default TagButton
