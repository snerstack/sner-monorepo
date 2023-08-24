import { Outlet } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import Nav from '@/components/Nav'

const BaseLayout = () => {
  return (
    <>
      <Nav />
      <main id="main" role="main" className="container-fluid">
        <Outlet />
        <ToastContainer />
      </main>
    </>
  )
}
export default BaseLayout
