import { NavigateFunction } from 'react-router-dom'

const ViewButton = ({ url, navigate }: { url: string; navigate: NavigateFunction }) => {
  return (
    <a
      data-testid="view-btn"
      className="btn btn-outline-secondary"
      href={url}
      onClick={(e) => {
        e.preventDefault()
        navigate(url)
      }}
      title="View"
    >
      <i className="fas fa-eye"></i>
    </a>
  )
}
export default ViewButton
