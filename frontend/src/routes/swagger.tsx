import { Helmet } from 'react-helmet-async'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

import { urlFor } from '@/lib/urlHelper'

const SwaggerPage = () => {
  return (
    <div>
      <Helmet>
        <title>API - SNER</title>
      </Helmet>
      <SwaggerUI url={urlFor('/api/doc/openapi.json')} />
    </div>
  )
}
export default SwaggerPage
