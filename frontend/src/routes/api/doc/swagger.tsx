import { Helmet } from 'react-helmet-async'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

const SwaggerPage = () => {
  return (
    <div>
      <Helmet>
        <title>API - sner4</title>
      </Helmet>
      <SwaggerUI url={import.meta.env.VITE_SERVER_URL + '/api/doc/openapi.json'} />
    </div>
  )
}
export default SwaggerPage
