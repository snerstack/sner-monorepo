import { NavigateFunction, useNavigate } from 'react-router-dom'

const LensButton = ({
  url,
  // eslint-disable-next-line react-hooks/rules-of-hooks
  navigate = useNavigate(),
  className,
}: {
  url: string
  navigate?: NavigateFunction
  className?: string
}) => {
  return (
    <a
      data-testid="edit-btn"
      className={className ? className : 'btn btn-outline-secondary'}
      href={url}
      onClick={(e) => {
        e.preventDefault()
        navigate(url)
      }}
    >
      <i className="fas fa-eye"></i>
    </a>
  )
}
export default LensButton
