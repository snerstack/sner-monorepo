import { capitalize } from '@/utils'

import { tagAction } from '@/lib/sner/storage'

const TagButton = ({ tag, url, tableId }: { tag: string; url: string; tableId: string }) => {
  return (
    <a
      className="btn btn-outline-secondary abutton_tag_multiid"
      href="#"
      title={`add tag ${tag}`}
      onClick={(e) => {
        e.preventDefault()
        tagAction({ tableId, tag, url, action: 'set' })
      }}
    >
      {capitalize(tag)}
    </a>
  )
}
export default TagButton
