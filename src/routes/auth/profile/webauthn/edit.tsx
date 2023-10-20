import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'

import Heading from '@/components/Heading'
import SubmitField from '@/components/fields/SubmitField'
import TextField from '@/components/fields/TextField'

const WebAuthnEditPage = () => {
  const cred = useLoaderData() as { id: number; name: string }
  const navigate = useNavigate()
  const [name, setName] = useState<string>(cred.name)

  const editHandler = async () => {
    const formData = new FormData()
    formData.append('name', name)

    try {
      const resp = await httpClient.post<{ message: string }>(
        import.meta.env.VITE_SERVER_URL + `/auth/profile/webauthn/edit/${cred.id}`,
        formData,
      )

      toast.success(resp.data.message)
      navigate('/auth/profile')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <Helmet>
        <title>User profile / Edit WebAuthn credential - sner4</title>
      </Helmet>

      <Heading headings={['User profile', 'Edit WebAuthn credential']} />

      <form id="webauthn_edit_form" method="post">
        <TextField name="name" label="Name" placeholder="Name" _state={name} _setState={setName} />
        <SubmitField name="Edit" handler={editHandler} />
      </form>
    </div>
  )
}
export default WebAuthnEditPage
