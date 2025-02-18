import { NavigateFunction, useNavigate } from 'react-router-dom'

const Button = ({
  name,
  title,
  url,
  className = "btn btn-outline-secondary",
  // eslint-disable-next-line react-hooks/rules-of-hooks
  navigate = useNavigate(),
}: {
  name: string
  title: string
  url: string
  className?: string
  navigate?: NavigateFunction
}) => {
  return (
    <a
      data-testid="btn"
      className={className}
      href={url}
      title={title}
      onClick={(e) => {
        e.preventDefault()
        navigate(url)
      }}
    >
      {name}
    </a>
  )
}
export default Button
