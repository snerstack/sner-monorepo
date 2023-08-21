import { capitalize } from '@/utils'

const TagsDropdownButton = ({ tags }: { tags: string[] }) => {
  return (
    <div className="dropdown-menu">
      {tags.map((tag) => (
        <a className="dropdown-item striked" href="#" title={`remove tag ${tag}`} data-tag={tag} key={tag}>
          {capitalize(tag)}
        </a>
      ))}
    </div>
  )
}
export default TagsDropdownButton
