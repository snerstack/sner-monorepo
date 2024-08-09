import { decode as cborDecode, encode as cborEncode } from 'cbor-x'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useRecoilState } from 'recoil'

import { userState } from '@/atoms/userAtom'

import httpClient from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'
import { arrayBufferToBase64, base64ToArrayBuffer } from '@/utils'

import Heading from '@/components/Heading'

interface AssertionCredential extends PublicKeyCredential {
  response: AuthenticatorAssertionResponse
}

const WebAuthnLoginPage = () => {
  const navigate = useNavigate()
  const [, setUser] = useRecoilState(userState)

  useEffect(() => {
    if (!window.PublicKeyCredential) {
      toast.warn('WebAuthn is not supported')
      return
    }
    void loginHandler()
  })

  const loginHandler = async () => {
    try {
      const pkcco = await getPublicKeyCredentialRequestOptions()
      const assertion = (await navigator.credentials.get(pkcco)) as AssertionCredential
      await loginWebauthn(assertion)
    /* c8 ignore next 4 */
    } catch (err) {
      console.error(err)
      toast.error('Webauthn login failed')
    }
  }

  const getPublicKeyCredentialRequestOptions = async (): Promise<CredentialCreationOptions> => {
    const resp = await httpClient.post<string>(urlFor('/backend/auth/login_webauthn_pkcro'))
    /* selenium CI helper */
    window.pkcro_raw = resp.data
    return cborDecode(base64ToArrayBuffer(resp.data)) as CredentialCreationOptions
  }

  const loginWebauthn = async (assertion: AssertionCredential) => {
    const assertionData = {
      credentialRawId: new Uint8Array(assertion.rawId),
      authenticatorData: new Uint8Array(assertion.response.authenticatorData),
      clientDataJSON: new Uint8Array(assertion.response.clientDataJSON),
      signature: new Uint8Array(assertion.response.signature),
      userHandle: new Uint8Array(assertion.response.userHandle!),
    }

    const formData = new FormData()
    formData.append('assertion', arrayBufferToBase64(cborEncode(assertionData)))
    const resp = await httpClient.post<User>(urlFor('/backend/auth/login_webauthn'), formData)
    setUser({ ...resp.data, isAuthenticated: true })
    navigate('/')
  }

  /* selenium CI helpers */
  window.base64ToArrayBuffer = base64ToArrayBuffer
  window.cborDecode = cborDecode
  window.loginWebauthn = loginWebauthn

  return (
    <div>
      <Helmet>
        <title>Login Webauthn - SNER</title>
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
