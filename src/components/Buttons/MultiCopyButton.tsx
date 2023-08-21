const MultiCopyButton = ({ url }: { url: string }) => {
  return (
    <a className="btn btn-outline-secondary" href={url} title="Multicopy">
      <i className="far fa-copy"></i>
    </a>
  )
}
export default MultiCopyButton
