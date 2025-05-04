import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useRecoilState } from 'recoil'

import { appConfigState } from '@/atoms/appConfigAtom'
import { userState } from '@/atoms/userAtom'

function RootPage() {
  const [appConfig,] = useRecoilState(appConfigState)
  const [currentUser,] = useRecoilState(userState)

  return (
    <div className="
      container d-flex flex-column justify-content-center align-items-center text-center
      bg-light rounded-lg
      mt-5"
    >
      <Helmet>
        <title>Homepage - SNER</title>
      </Helmet>

      <img className="mt-4 mb-4" src="/logo.png" alt="SNER Logo" />

      <h1 className="display-4 mb-4">Slow Network Recon Service</h1>

      <p className="lead text-muted w-50 mb-4">
        SNER is a proactive network monitoring service operated by CESNET
        for network security and research purposes.
      </p>

      <div className="d-flex flex-column flex-sm-row mb-5">
        {!currentUser.isAuthenticated && (
          <Link className="btn btn-outline-secondary btn-lg mr-2" to="/auth/login">
            Login
          </Link>
        )}
        <a className="btn btn-outline-secondary btn-lg" href={appConfig.docs_link}>
          Documentation
        </a>
      </div>
    </div>
  )
}

export default RootPage
