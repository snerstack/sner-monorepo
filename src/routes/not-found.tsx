import { Link } from 'react-router-dom'

const NotFoundPage = () => {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100">
      <h1 className="mb-4">Not Found (404)</h1>
      <Link className="btn btn-primary" to="/">
        Go Home
      </Link>
    </div>
  )
}
export default NotFoundPage
