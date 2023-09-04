import { capitalize } from '@/utils'

import { getTableApi } from '@/lib/DataTables'
import { getSelectedIdsFormData, tagAction } from '@/lib/sner/storage'

const TagsDropdownButton = ({ tags, url, tableId }: { tags: string[]; url: string; tableId: string }) => {
  return (
    <div className="dropdown-menu">
      {tags.map((tag) => (
        <a
          className="dropdown-item striked"
          href="#"
          title={`remove tag ${tag}`}
          key={tag}
          onClick={(e) => {
            e.preventDefault()
            const ids = getSelectedIdsFormData(getTableApi(tableId))

            tagAction({ ids, tag, url, action: 'unset' })
          }}
        >
          {capitalize(tag)}
        </a>
      ))}
    </div>
  )
}
export default TagsDropdownButton
