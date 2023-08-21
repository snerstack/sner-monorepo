import { ReactElement } from 'react'
import Nav from '@/components/Nav'

const BaseLayout = ({ children }: { children: ReactElement }) => {
  return (
    <>
      <Nav />
      <main role="main" className="container-fluid">
        {children}
      </main>
    </>
  )
}
export default BaseLayout
