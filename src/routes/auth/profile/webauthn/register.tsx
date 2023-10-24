import { arrayBufferToBase64, base64ToArrayBuffer } from '@/utils'
import { isAxiosError } from 'axios'
import { decode, encode } from 'cbor-x'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'

import Heading from '@/components/Heading'
import SubmitField from '@/components/fields/SubmitField'
import TextField from '@/components/fields/TextField'

interface CustomPublicKeyCredential extends PublicKeyCredential {
  response: {
    clientDataJSON: ArrayBuffer
    attestationObject: ArrayBuffer
  }
}

const WebAuthnRegisterPage = () => {
  const navigate = useNavigate()
  const [name, setName] = useState<string>('')
  const [isPrepared, setIsPrepared] = useState<boolean>(false)
  const [attestation, setAttestation] = useState<string>('')

  useEffect(() => {
    if (!window.PublicKeyCredential) {
      toast.warn('WebAuthn is not supported.')
      return
    }

    void (async () => {
      try {
        const pkcco = await getPublicKeyCredentialRequestOptions()
        const attestation = (await navigator.credentials.create(pkcco)) as PublicKeyCredential
        const packedAttestation = getPackedAttestation(attestation as CustomPublicKeyCredential)

        setIsPrepared(true)
        setAttestation(packedAttestation)
      } catch (err) {
        setIsPrepared(false)
        toast.error((err as Error).message)
      }
    })()
  }, [])

  const registerHandler = async () => {
    const formData = new FormData()
    formData.append('name', name)
    formData.append('attestation', attestation)

    try {
      const resp = await httpClient.post<{ message: string }>(
        import.meta.env.VITE_SERVER_URL + '/auth/profile/webauthn/register',
        formData,
      )

      toast.success(resp.data.message)
      navigate('/auth/profile')
    } catch (err) {
      if (isAxiosError<{ error: { message: string; code: number } }>(err)) {
        toast.error(err.response?.data.error.message)
      } else {
        toast.error((err as Error).message)
      }
    }
  }

  return (
    <div>
      <Helmet>
        <title>User profile / Register WebAuthn credential - sner4</title>
      </Helmet>
      <Heading headings={['User profile', 'Register WebAuthn credential']} />
      <div>
        To register new credential:
        <ol>
          <li>Insert/connect authenticator and verify user presence.</li>
          <li>Optionaly set comment for the new credential.</li>
          <li>Submit the registration.</li>
        </ol>
      </div>

      <form id="webauthn_register_form" method="post">
        <div className="form-group">
          <label className="col-sm-2 col-form-label">Registration data</label>
          <div className="col-sm-10">
            <div className="form-control-plaintext">
              <span className={clsx(isPrepared ? 'text-success' : 'text-warning')}>
                {isPrepared ? 'Prepared' : 'To be prepared'}
              </span>
            </div>
          </div>
        </div>
        <TextField name="name" label="Name" placeholder="Name" _state={name} _setState={setName} />
        <SubmitField name="Register" handler={registerHandler} />
      </form>
    </div>
  )
}
export default WebAuthnRegisterPage

const getPublicKeyCredentialRequestOptions = async (): Promise<CredentialCreationOptions> => {
  const resp = await httpClient.post<string>(import.meta.env.VITE_SERVER_URL + '/auth/profile/webauthn/pkcco')

  return decode(base64ToArrayBuffer(resp.data)) as CredentialCreationOptions
}

const getPackedAttestation = (attestation: CustomPublicKeyCredential): string => {
  const attestationData = {
    clientDataJSON: new Uint8Array(attestation.response.clientDataJSON),
    attestationObject: new Uint8Array(attestation.response.attestationObject),
  }

  return arrayBufferToBase64(encode(attestationData))
}
