import App from './App.tsx'
import './fontawesome/css/all.min.css'
import './styles/dt-b4.css'
import './styles/dt-select-b4.css'
import './styles/index.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.min.js'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { RecoilRoot } from 'recoil'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RecoilRoot>
    <HelmetProvider>
      <App />
      <ToastContainer />
    </HelmetProvider>
  </RecoilRoot>,
)
