import { arrayBufferToBase64, base64ToArrayBuffer } from '@/utils';
import { decode as cborDecode, encode as cborEncode } from 'cbor-x';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { httpClient } from '@/lib/httpClient';
import { urlFor } from '@/lib/urlHelper';

import Heading from '@/components/Heading';
import SubmitField from '@/components/fields/SubmitField';
import TextField from '@/components/fields/TextField';

interface AttestationCredential extends PublicKeyCredential {
  response: AuthenticatorAttestationResponse
}

const WebAuthnRegisterPage = () => {
  const navigate = useNavigate()
  const [name, setName] = useState<string>('')
  const [attestation, setAttestation] = useState<AttestationCredential | null>(null)

  useEffect(() => {
    /* c8 ignore next 4 */
    if (!window.PublicKeyCredential) {
      toast.warn('WebAuthn is not supported')
      return
    }
    
    const prepareAttestation = async (): Promise<void> => {
      try {
        const pkcco = await getPublicKeyCredentialRequestOptions()
        const attResponse = (await navigator.credentials.create(pkcco)) as AttestationCredential
        setAttestation(attResponse)
      /* c8 ignore next 4 */
      } catch (err) {
        console.error(err)
        toast.error('Webauthn prepare attestation failed')
      }
    }
    void prepareAttestation()
  }, [])

  const getPublicKeyCredentialRequestOptions = async (): Promise<CredentialCreationOptions> => {
    const resp = await httpClient.post<string>(urlFor('/backend/auth/profile/webauthn/pkcco'))
    /* selenium CI helper */
    window.pkcco_raw = resp.data
    return cborDecode(base64ToArrayBuffer(resp.data)) as CredentialCreationOptions
  }

  const registerHandler = async () => {
    /* c8 ignore next 4 */
    if (!attestation) {
      toast.error("Attestation not prepared")
      return
    }

    const attestationData = {
      clientDataJSON: new Uint8Array(attestation.response.clientDataJSON),
      attestationObject: new Uint8Array(attestation.response.attestationObject),
    }
    const formData = new FormData()
    formData.append('name', name)
    formData.append('attestation', arrayBufferToBase64(cborEncode(attestationData)))

    try {
      const resp = await httpClient.post<{ message: string }>(
        urlFor('/backend/auth/profile/webauthn/register'),
        formData
      )
      toast.success(resp.data.message)
      navigate('/auth/profile')
    /* c8 ignore next 4 */
    } catch (err) {
      console.error(err)
      toast.error('Webauthn registration failed')
    }
  }

  /* selenium CI helpers */
  window.base64ToArrayBuffer = base64ToArrayBuffer
  window.cborDecode = cborDecode
  window.setAttestation = setAttestation

  return (
    <div>
      <Helmet>
        <title>User profile / Register WebAuthn credential - SNER</title>
      </Helmet>
      <Heading headings={['User profile', 'Register WebAuthn credential']} />
      <div>
        To register new credential:
        <ol>
          <li>Insert/connect authenticator and verify user presence.</li>
          <li>Optionally set a comment for the new credential.</li>
          <li>Submit the registration.</li>
        </ol>
      </div>
      <form id="webauthn_register_form" method="post">
        <div className="form-group">
          <label className="col-sm-2 col-form-label">Registration data</label>
          <div className="col-sm-10">
            <div className="form-control-plaintext">
              <span className={clsx(attestation ? 'text-success' : 'text-warning')}>
                {attestation ? 'Prepared' : 'To be prepared'}
              </span>
            </div>
          </div>
        </div>
        <TextField name="name" label="Name" placeholder="Name" _state={name} _setState={setName} required />
        <SubmitField name="Register" handler={registerHandler} />
      </form>
    </div>
  )
}
export default WebAuthnRegisterPage