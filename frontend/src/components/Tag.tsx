import { getColorForTag, invertColor } from '@/lib/sner/tags'

const Tag = ({ tag }: { tag: string }) => {
  return (
    <span
      className="badge tag-badge"
      style={{ background: getColorForTag(tag), color: invertColor(getColorForTag(tag)) }}
      data-testid="tag"
    >
      {tag}
    </span>
  )
}
export default Tag
