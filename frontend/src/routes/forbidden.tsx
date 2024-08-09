import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

const ForbiddenPage = () => {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100">
      <Helmet>
        <title>Not Authorized - SNER</title>
      </Helmet>
      <h1 className="mb-4">Not Authorized (403)</h1>
      <div>
        <Link className="btn btn-primary mx-2" to="/">
          Go Home
        </Link>
        <Link className="btn btn-primary mx-2" to="/auth/login">
          Login
        </Link>
      </div>
    </div>
  )
}
export default ForbiddenPage
