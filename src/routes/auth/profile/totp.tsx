import env from 'app-env'
import { isAxiosError } from 'axios'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'

import SubmitField from '@/components/Fields/SubmitField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'

const TOTPPage = () => {
  const { provisioning_url, secret } = useLoaderData() as {
    provisioning_url: string
    secret: string
  }
  const navigate = useNavigate()

  const [code, setCode] = useState<string>('')
  const [qrCode, setQrcode] = useState<string>('')

  useEffect(() => {
    if (provisioning_url) {
      QRCode.toDataURL(provisioning_url)
        .then((data: string) => setQrcode(data))
        .catch((err) => console.log(err))
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totpHandler = async () => {
    const formData = new FormData()
    formData.append('code', code)

    try {
      const resp = await httpClient.post<{ message: string }>(env.VITE_SERVER_URL + '/auth/profile/totp', formData)

      toast.success(resp.data.message)
      navigate('/auth/profile')
    } catch (err) {
      if (isAxiosError<{ error: { message: string; code: number } }>(err)) {
        toast.error(err.response?.data.error.message)
      }
    }
  }

  return (
    <div>
      <Helmet>
        <title>User profile / 2-factor authentication setup - sner4</title>
      </Helmet>

      <Heading headings={['User profile', secret ? '2-factor authentication setup (enable)' : 'Disable']} />
      <div>
        To enable two-factor authentication::
        <ol>
          <li>Scan the barcode or add the text seed to your authenticator.</li>
          <li>Verify pairing with one code.</li>
        </ol>
      </div>
      <form id="totp_code_form" method="post">
        {secret && (
          <>
            <div className="form-group row">
              <label className="col-sm-2 col-form-label">Secret</label>
              <div className="col-sm-10">
                <div className="form-control-plaintext">{secret}</div>
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-2 col-form-label">Secret QR code</label>
              <div className="col-sm-10">
                <div className="form-control-plaintext">{qrCode && <img src={qrCode} />}</div>
              </div>
            </div>
          </>
        )}
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
export default TOTPPage
