import { Helmet } from 'react-helmet-async'

import Heading from '@/components/Heading'

const VisualsPage = () => {
  return (
    <div>
      <Helmet>
        <title>Visuals - sner4</title>
      </Helmet>
      <Heading headings={['Visuals']} />
    </div>
  )
}
export default VisualsPage
