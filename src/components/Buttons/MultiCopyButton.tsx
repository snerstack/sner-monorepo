import { NavigateFunction, useNavigate } from 'react-router-dom'

const MultiCopyButton = ({ url, navigate = useNavigate() }: { url: string; navigate?: NavigateFunction }) => {
  return (
    <a className="btn btn-outline-secondary" href={url} title="Multicopy">
      <i className="far fa-copy"></i>
    </a>
  )
}
export default MultiCopyButton
