import { useState } from 'react'

import SubmitField from '@/components/Fields/SubmitField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'

const WebAuthnRegisterPage = () => {
  const [name, setName] = useState<string>('')

  const registerHandler = () => {}

  return (
    <div>
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
            <div className="form-control-plaintext" name="attestation_data_status">
              <span className="text-warning">To be prepared</span>
            </div>
          </div>
        </div>
        {/* {{ bwtf.bootstrap_field(form.attestation, horizontal=True) }} */}

        <TextField name="name" label="Name" placeholder="Name" _state={name} _setState={setName} />
        <SubmitField name="Register" handler={registerHandler} />
      </form>
    </div>
  )
}
export default WebAuthnRegisterPage
