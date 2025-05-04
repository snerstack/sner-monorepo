import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useRecoilState } from 'recoil'

import { appConfigState } from '@/atoms/appConfigAtom'
import { userState } from '@/atoms/userAtom'
import { handleHttpClientError, httpClient } from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

import Heading from '@/components/Heading'
import PasswordField from '@/components/fields/PasswordField'
import SubmitField from '@/components/fields/SubmitField'
import TextField from '@/components/fields/TextField'

const LoginPage = () => {
  const [appConfig,] = useRecoilState(appConfigState)
  const navigate = useNavigate()
  const [, setUser] = useRecoilState(userState)

  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  const loginHandler = async () => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)

    try {
      const resp = await httpClient.post<User | { totp_login_required: boolean } | { webauthn_login: boolean }>(
        urlFor('/backend/auth/login'),
        formData,
      )

      if ('totp_login_required' in resp.data) {
        navigate('/auth/login_totp')
        return
      }

      if ('webauthn_login' in resp.data) {
        navigate('/auth/login_webauthn')
        return
      }

      setUser({ ...resp.data, isAuthenticated: true })

      navigate('/')
    } catch (err) {
      handleHttpClientError(err)
    }
  }

  return (
    <div>
      <Helmet>
        <title>Login - SNER</title>
      </Helmet>
      <Heading headings={['Login']} />

      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            {appConfig.oidc_enabled && (
              <>
                {/* OIDC Login Card */}
                <div className="card shadow-sm mb-4">
                  <div className="card-body d-flex flex-column justify-content-between h-100">
                    <h5 className="card-title">{appConfig.oidc_display_name}</h5>
                    <p className="card-text text-muted">
                      This method is preferred for all users.
                    </p>
                    <a className="btn btn-primary mb-4" href={urlFor('/backend/auth/login_oidc')}>Login</a>

                    <div className="card shadow-sm small disclaimer-card">
                      <div className="card-body d-flex flex-column justify-content-between h-100">
                        <div>
                          By logging in or registering, you confirm that you have read and agree to{' '}
                          <a href={appConfig.tos_link}>Terms of Service</a> and the <a href={appConfig.pdp_link}>Personal Data Processing Policy</a>.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Local accounts Login Card */}
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h5 className="card-title">Local account</h5>
                <p className="card-text text-muted">
                  This login method is for administrators or service accounts only.
                </p>
                <form id="login_form" method="post">
                  <TextField
                    name="username"
                    label="Username"
                    placeholder="Username"
                    required={true}
                    horizontal={false}
                    _state={username}
                    _setState={setUsername}
                  />
                  <PasswordField
                    name="password"
                    label="Password"
                    placeholder="Password"
                    required={true}
                    horizontal={false}
                    _state={password}
                    _setState={setPassword}
                  />
                  <SubmitField
                    name="Login"
                    className="w-100"
                    horizontal={false}
                    handler={loginHandler}
                  />
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  )
}
export default LoginPage
