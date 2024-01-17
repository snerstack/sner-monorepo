import { Outlet } from 'react-router-dom'

import Nav from '@/components/Nav'

const BaseLayout = () => {
  return (
    <>
      <Nav />
      <main id="main" role="main" className="container-fluid">
        <Outlet />
      </main>
    </>
  )
}
export default BaseLayout
