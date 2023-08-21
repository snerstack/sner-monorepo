const Button = ({ name, title, url }: { name: string; title: string; url: string }) => {
  return (
    <a className="btn btn-outline-secondary" href={url} title={title}>
      {name}
    </a>
  )
}
export default Button
