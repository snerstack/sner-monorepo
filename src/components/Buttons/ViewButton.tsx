const ViewButton = ({ url }: { url: string }) => {
  return (
    <a className="btn btn-outline-secondary" href={url} title="View">
      <i className="fas fa-eye"></i>
    </a>
  )
}
export default ViewButton
