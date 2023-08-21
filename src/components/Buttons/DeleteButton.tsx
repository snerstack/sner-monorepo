const DeleteButton = ({ url }: { url: string }) => {
  return (
    <a className="btn btn-outline-secondary abutton_submit_dataurl_delete" data-url={url}>
      <i className="fas fa-trash text-danger"></i>
    </a>
  )
}
export default DeleteButton
