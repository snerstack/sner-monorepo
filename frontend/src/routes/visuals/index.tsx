import { Helmet } from 'react-helmet-async'

import Heading from '@/components/Heading'

const VisualsPage = () => {
  return (
    <div>
      <Helmet>
        <title>Visuals - SNER</title>
      </Helmet>
      <Heading headings={['Visuals']} />
    </div>
  )
}
export default VisualsPage
