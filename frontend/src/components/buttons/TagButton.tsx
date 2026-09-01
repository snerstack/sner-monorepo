import { getTableApi } from '@/lib/DataTables'
import { getSelectedIds, tagAction } from '@/lib/sner/storage'
import { capitalize } from '@/lib/utils'

const TagButton = ({
  tag,
  url,
  tableId,
  id,
  reloadPage,
  className,
}: {
  tag: string
  url: string
  tableId?: string
  id?: number
  reloadPage?: boolean
  className?: string
}) => {
  return (
    <a
      data-testid="tag-btn"
      className={className ? className : 'btn btn-outline-secondary'}
      href="#"
      title={`Add tag "${tag}"`}
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onClick={async (e) => {
        e.preventDefault()
        if (id) {
          await tagAction({ ids: [id], tag, url, action: 'set' })
        }

        if (tableId) {
          const ids = getSelectedIds(getTableApi(tableId))

          await tagAction({ ids, tag, url, action: 'set' })
          getTableApi(tableId).draw()
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
