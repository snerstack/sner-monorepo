import { Helmet } from 'react-helmet-async'
import { useLoaderData } from 'react-router-dom'

import Heading from '@/components/Heading'

const VulnSearchViewPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { vsearch, cve_data } = useLoaderData() as { vsearch: VulnSearch; cve_data: { [key: string]: any } }

  return (
    <div>
      <Helmet>
        <title>Vulnsearch / View / {vsearch.id} - SNER</title>
      </Helmet>
      <Heading headings={['Vulnsearch', vsearch.id]} />

      <h2>Vulnsearch {vsearch.id}</h2>
      <pre className="break-spaces">{JSON.stringify(vsearch, null, 2)}</pre>

      <h2>CVE data</h2>
      <pre className="break-spaces">{JSON.stringify(cve_data, null, 2)}</pre>
    </div>
  )
}

export default VulnSearchViewPage
