import hljs from 'highlight.js'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLoaderData } from 'react-router-dom'

import 'highlight.js/styles/default.css'

import CodeBlock from '@/components/CodeBlock'
import Heading from '@/components/Heading'

const InternalsPage = () => {
  const { metrics, heatmap_check, exclusions, planner, lastruns } = useLoaderData() as Internals

  useEffect(() => {
    hljs.highlightAll()
  }, [metrics, heatmap_check, exclusions, planner, lastruns])

  return (
    <div>
      <Helmet>
        <title>Visuals / Internals - SNER</title>
      </Helmet>

      <Heading headings={['Visuals', 'Internals']} />

      <h2>Heatmap heck</h2>
      <CodeBlock language="language-yaml" data={`heatmap_consistent: ${heatmap_check.toString()}`} />

      <h2>Metrics</h2>
      <CodeBlock language="language-yaml" data={metrics} />

      <h2>Exclusions</h2>
      <CodeBlock language="language-yaml" data={exclusions} />

      <h2>Planner</h2>
      <CodeBlock language="language-yaml" data={planner} />

      <h2>Last runs</h2>
      <CodeBlock language="language-yaml" data={lastruns} />
    </div>
  )
}

export default InternalsPage
