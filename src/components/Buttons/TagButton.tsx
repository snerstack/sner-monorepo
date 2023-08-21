import { capitalize } from '@/utils'

const TagButton = ({ tag }: { tag: string }) => {
  return (
    <a className="btn btn-outline-secondary abutton_tag_multiid" href="#" title={`add tag ${tag}`} data-tag={tag}>
      {capitalize(tag)}
    </a>
  )
}
export default TagButton
