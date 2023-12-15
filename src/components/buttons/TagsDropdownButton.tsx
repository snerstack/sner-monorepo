import { capitalize } from '@/utils'

import { getTableApi } from '@/lib/DataTables'
import { getSelectedIdsFormData, tagAction } from '@/lib/sner/storage'

const TagsDropdownButton = ({ tags, url, tableId }: { tags: string[]; url: string; tableId: string }) => {
  return (
    <div className="dropdown-menu">
      {tags.map((tag) => (
        <a
          data-testid="tag-dropdown-btn"
          className="dropdown-item striked"
          href="#"
          title={`remove tag ${tag}`}
          key={tag}
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onClick={async (e) => {
            e.preventDefault()
            const ids = getSelectedIdsFormData(getTableApi(tableId))

            await tagAction({ ids, tag, url, action: 'unset' })
            getTableApi(tableId).ajax.reload()
          }}
        >
          {capitalize(tag)}
        </a>
      ))}
    </div>
  )
}
export default TagsDropdownButton
