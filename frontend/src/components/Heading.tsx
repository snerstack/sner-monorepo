import { ReactElement } from 'react'

const Heading = ({ children, headings }: { children?: ReactElement; headings: string[] }) => {
  return (
    <div className="d-flex align-items-center mb-2" data-testid="heading">
      <ol className="breadcrumb flex-grow-1 py-2 mb-0">
        {headings.slice(0, -1).map((heading, index) => (
          <li key={index} className="breadcrumb-item">
            {heading}
          </li>
        ))}
        <li className="breadcrumb-item font-weight-bold">{headings[headings.length - 1]}</li>
      </ol>
      {children}
    </div>
  )
}
export default Heading
