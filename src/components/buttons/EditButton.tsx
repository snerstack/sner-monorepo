import { NavigateFunction, useNavigate } from 'react-router-dom'

const EditButton = ({
  url,
  // eslint-disable-next-line react-hooks/rules-of-hooks
  navigate = useNavigate(),
}: {
  url: string
  navigate?: NavigateFunction
}) => {
  return (
    <a
      data-testid="edit-btn"
      className="btn btn-outline-secondary"
      href={url}
      onClick={(e) => {
        e.preventDefault()
        navigate(url)
      }}
    >
      <i className="fas fa-edit"></i>
    </a>
  )
}
export default EditButton
