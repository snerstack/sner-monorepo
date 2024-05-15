import hljs from 'highlight.js'
import 'highlight.js/styles/default.css'
import { useEffect } from 'react'

const CodeBlock = ({ data, language }: { data: string; language: string }) => {
  hljs.configure({ ignoreUnescapedHTML: true })

  useEffect(() => {
    hljs.highlightAll()
  }, [data, language])

  return (
    <pre className="break-spaces">
      <code className={language}>{data}</code>
    </pre>
  )
}

export default CodeBlock
