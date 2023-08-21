const EditButton = ({ url }: { url: string }) => {
  return (
    <a className="btn btn-outline-secondary" href={url}>
      <i className="fas fa-edit"></i>
    </a>
  )
}
export default EditButton
