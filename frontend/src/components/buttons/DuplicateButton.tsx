import { handleHttpClientError, httpClient } from '@/lib/httpClient'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

const DuplicateButton = ({ url, className }: { url: string, className?: string }) => {
  const navigate = useNavigate()

  const handler = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    try {
      const response = await httpClient.post<{ new_id: number }>(url)
      toast.success("Duplicated")
      navigate(`/storage/vuln/view/${response.data.new_id}`)
    /* c8 ignore next 3 */
    } catch (err) {
      handleHttpClientError(err)
    }
  }

  return (
    <a
      data-testid="duplicate-btn"
      className={className ? className : 'btn btn-outline-secondary'}
      title="Duplicate"
      onClick={(e) => void handler(e)}
    >
      <i className="fas fa-code-branch"></i>
    </a>
  )
}
export default DuplicateButton
