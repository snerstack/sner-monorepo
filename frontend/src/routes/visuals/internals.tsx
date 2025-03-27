import hljs from 'highlight.js'
import 'highlight.js/styles/default.css'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLoaderData } from 'react-router-dom'

import CodeBlock from '@/components/CodeBlock'
import Heading from '@/components/Heading'

const InternalsPage = () => {
  const { metrics, heatmap_check, exclusions, planner } = useLoaderData() as Internals

  useEffect(() => {
    hljs.highlightAll()
  }, [metrics, heatmap_check, exclusions, planner])

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
    </div>
  )
}

export default InternalsPage
