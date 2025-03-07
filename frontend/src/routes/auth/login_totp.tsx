import { isAxiosError } from 'axios'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useRecoilState } from 'recoil'

import { userState } from '@/atoms/userAtom'

import { httpClient } from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

import Heading from '@/components/Heading'
import SubmitField from '@/components/fields/SubmitField'
import TextField from '@/components/fields/TextField'

const TOTPLoginPage = () => {
  const [, setUser] = useRecoilState(userState)
  const [code, setCode] = useState<string>('')
  const navigate = useNavigate()

  const totpHandler = async () => {
    const formData = new FormData()
    formData.append('code', code)

    try {
      const resp = await httpClient.post<User>(urlFor('/backend/auth/login_totp'), formData)

      setUser({ ...resp.data, isAuthenticated: true })

      navigate('/')
    } catch (err) {
      if (isAxiosError<{ error: { message: string; code: number } }>(err)) {
        toast.error(err.response?.data.error.message)
      }
    }
  }

  return (
    <div>
      <Helmet>
        <title>Login TOTP - SNER</title>
      </Helmet>
      <Heading headings={['Login with 2FA']} />

      <form id="totp_code_form" method="post">
        <TextField
          name="totp_code"
          label="TOTP Code"
          placeholder="TOTP Code"
          required={true}
          _state={code}
          _setState={setCode}
        />
        <SubmitField name="Submit" handler={totpHandler} />
      </form>
    </div>
  )
}
export default TOTPLoginPage
