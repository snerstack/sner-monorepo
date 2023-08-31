import { useState } from 'react'

import SubmitField from '@/components/Fields/SubmitField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'

const TOTPLoginPage = () => {
  const [code, setCode] = useState<string>('')

  const totpHandler = () => {}

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
