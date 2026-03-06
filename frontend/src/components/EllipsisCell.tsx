const EllipsisCell = ({ data }: { data: string }) => {
  const MAX = 2048
  const truncated = data.length > MAX ? data.substring(0, MAX - 3) + '...' : data
  return <span>{truncated}</span>
}

export default EllipsisCell