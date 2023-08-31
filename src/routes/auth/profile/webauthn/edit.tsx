import { useState } from 'react'

import SubmitField from '@/components/Fields/SubmitField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'

const WebAuthnEditPage = () => {
  const [name, setName] = useState<string>('')

  const editHandler = () => {}

  return (
    <div>
      <Heading headings={['User profile', 'Edit WebAuthn credential']} />

      <form id="webauthn_edit_form" method="post">
        <TextField name="name" label="Name" placeholder="Name" _state={name} _setState={setName} />
        <SubmitField name="Edit" handler={editHandler} />
      </form>
    </div>
  )
}
export default WebAuthnEditPage
