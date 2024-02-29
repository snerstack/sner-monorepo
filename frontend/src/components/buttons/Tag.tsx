import { invertColor } from '@/utils'
import { useTagConfig } from '@/zustandHooks/useTagConfig'

import { getColorForTag } from '@/lib/sner/storage'

const Tag = ({ tag }: { tag: string }) => {
  const { setTagConfig } = useTagConfig()

  return (
    <span
      role="button"
      style={{ background: getColorForTag(tag), color: invertColor(getColorForTag(tag)) }}
      className="badge tag-badge"
      data-testid="tag"
      onClick={() => {
        setTagConfig({ show: true, tag, color: getColorForTag(tag) })
      }}
    >
      {tag}
    </span>
  )
}
export default Tag
