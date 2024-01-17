import { Helmet } from 'react-helmet-async'
import { useLoaderData } from 'react-router-dom'

import Heading from '@/components/Heading'

const InternalsPage = () => {
  const { metrics, heatmap_check, exclusions, planner } = useLoaderData() as Internals

  return (
    <div>
      <Helmet>
        <title>Visuals / Internals - sner4</title>
      </Helmet>

      <Heading headings={['Visuals', 'Internals']} />

      <h2>Heatmap heck</h2>
      <pre>
        <code className="hljs language-yaml">heatmap_consistent: {heatmap_check.toString()}</code>
      </pre>

      <h2>Metrics</h2>
      <pre>
        <code className="hljs language-yaml">{metrics}</code>
      </pre>

      <h2>Exclusions</h2>
      <pre>
        <code className="hljs language-yaml">{exclusions}</code>
      </pre>

      <h2>Planner</h2>
      <pre>
        <code className="hljs language-yaml">{planner}</code>
      </pre>
    </div>
  )
}
export default InternalsPage
