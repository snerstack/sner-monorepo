import { useLoaderData } from 'react-router-dom'

import Heading from '@/components/Heading'

const InternalsPage = () => {
  const { exclusions, planner } = useLoaderData() as Internals

  return (
    <div>
      <Heading headings={['Visuals', 'Internals']} />

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
