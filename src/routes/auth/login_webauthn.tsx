import { arrayBufferToBase64, base64ToArrayBuffer } from '@/utils'
import { isAxiosError } from 'axios'
import { decode, encode } from 'cbor-x'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useRecoilState } from 'recoil'

import { userState } from '@/atoms/userAtom'

import httpClient from '@/lib/httpClient'

import Heading from '@/components/Heading'

interface CustomPublicKeyCredential extends PublicKeyCredential {
  response: {
    authenticatorData: ArrayBuffer
    clientDataJSON: ArrayBuffer
    signature: ArrayBuffer
    userHandle: ArrayBuffer
  }
}

const WebAuthnLoginPage = () => {
  const navigate = useNavigate()
  const [, setUser] = useRecoilState(userState)

  useEffect(() => {
    console.info(window.PublicKeyCredential ? 'WebAuthn supported' : 'WebAuthn NOT supported')

    if (!window.PublicKeyCredential) return

    void (async () => {
      try {
        const pkcco = await getPublicKeyCredentialRequestOptions()

        const assertion = (await navigator.credentials.get(pkcco)) as PublicKeyCredential
        const packedAssertion = getPackedAssertion(assertion as CustomPublicKeyCredential)

        void loginHandler(packedAssertion)
      } catch (err) {
        console.error(err)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loginHandler = async (assertion: string) => {
    const formData = new FormData()
    formData.append('assertion', assertion)

    try {
      const resp = await httpClient.post<User>(import.meta.env.VITE_SERVER_URL + '/auth/login_webauthn', formData)

      setUser({ ...resp.data, isAuthenticated: true })

      navigate('/')
    } catch (err) {
      console.error(err)
      if (isAxiosError<{ error: { message: string; code: number } }>(err)) {
        toast.error(err.response?.data.error.message)
      }
    }
  }

  return (
    <div>
      <Helmet>
        <title>Login Webauthn - sner4</title>
      </Helmet>
      <Heading headings={['WebAuthn Login']} />
      <div>
        To login with registered Webauthn authenticator
        <ol>
          <li>Insert/connect the authenticator and verify user presence.</li>
          <li>If authenticator gets rejected, refresh the page and try again.</li>
          <li>If none of you authenticator works, login normaly with password.</li>
        </ol>
      </div>
    </div>
  )
}

export default WebAuthnLoginPage

const getPublicKeyCredentialRequestOptions = async (): Promise<CredentialCreationOptions> => {
  const resp = await httpClient.post<string>(import.meta.env.VITE_SERVER_URL + '/auth/login_webauthn_pkcro')

  return decode(base64ToArrayBuffer(resp.data)) as CredentialCreationOptions
}

const getPackedAssertion = (assertion: CustomPublicKeyCredential): string => {
  const assertionData = {
    credentialRawId: new Uint8Array(assertion.rawId),
    authenticatorData: new Uint8Array(assertion.response.authenticatorData),
    clientDataJSON: new Uint8Array(assertion.response.clientDataJSON),
    signature: new Uint8Array(assertion.response.signature),
    userHandle: new Uint8Array(assertion.response.userHandle),
  }

  return arrayBufferToBase64(encode(assertionData))
}
