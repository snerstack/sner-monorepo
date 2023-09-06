import env from 'app-env'
import axios from 'axios'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useRecoilState } from 'recoil'

import { userState } from '@/atoms/userAtom'

import httpClient from '@/lib/httpClient'

import SubmitField from '@/components/Fields/SubmitField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'

const TOTPLoginPage = () => {
  const [, setUser] = useRecoilState(userState)
  const [code, setCode] = useState<string>('')
  const navigate = useNavigate()

  const totpHandler = async () => {
    const formData = new FormData()
    formData.append('code', code)

    try {
      const resp = await httpClient.post<User>(env.VITE_SERVER_URL + '/auth/login_totp', formData)

      setUser({ ...resp.data, isAuthenticated: true })

      navigate('/')
    } catch (err) {
      if (axios.isAxiosError<{ error: { message: string; code: number } }>(err)) {
        toast.error(err.response?.data.error.message)
      }
    }
  }

  return (
    <div>
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
