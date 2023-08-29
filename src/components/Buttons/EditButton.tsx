import { NavigateFunction, useNavigate } from 'react-router-dom'

const EditButton = ({ url, navigate = useNavigate() }: { url: string; navigate?: NavigateFunction }) => {
  return (
    <a
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
