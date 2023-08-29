import { NavigateFunction, useNavigate } from 'react-router-dom'

const Button = ({
  name,
  title,
  url,
  navigate = useNavigate(),
}: {
  name: string
  title: string
  url: string
  navigate?: NavigateFunction
}) => {
  return (
    <a
      className="btn btn-outline-secondary"
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
