import { Helmet } from 'react-helmet-async'

function RootPage() {
  return (
    <div className="jumbotron text-center">
      <Helmet>
        <title>Homepage - SNER</title>
      </Helmet>
      <h1 className="py-5">Slow Network Recon Service</h1>
      <img src="/logo.png" />
    </div>
  )
}

export default RootPage
