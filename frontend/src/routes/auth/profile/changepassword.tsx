import { isAxiosError } from 'axios'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { httpClient } from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

import Heading from '@/components/Heading'
import PasswordField from '@/components/fields/PasswordField'
import SubmitField from '@/components/fields/SubmitField'

const ChangePasswordPage = () => {
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [newPasswordAgain, setNewPasswordAgain] = useState<string>('')

  const [newPasswordErrors, setNewPasswordErrors] = useState<string[]>([])

  const newPasswordHandler = async () => {
    setNewPasswordErrors([])

    const formData = new FormData()
    formData.append('current_password', currentPassword)
    formData.append('password1', newPassword)
    formData.append('password2', newPasswordAgain)

    try {
      const resp = await httpClient.post<{ message: string }>(
        urlFor('/backend/auth/profile/changepassword'),
        formData,
      )

      toast.success(resp.data.message)
      navigate('/auth/profile')
    } catch (err) {
      if (
        isAxiosError<{
          error: { code: number; message?: string; errors?: { current_password?: string[]; password1?: string[] } }
        }>(err)
      ) {
        const errors = err.response?.data.error.errors

        if (errors) {
          if (errors.password1) {
            setNewPasswordErrors(errors.password1)
          }
          return
        }

        const message = err.response?.data.error.message

        toast.error(message)
      }
    }
  }

  return (
    <div>
      <Helmet>
        <title>User profile / Change password - SNER</title>
      </Helmet>

      <Heading headings={['User profile', 'Change password']} />
      <form id="user_change_password_form" method="post">
        <PasswordField
          name="current_password"
          label="Current password"
          placeholder="Current password"
          required={true}
          _state={currentPassword}
          _setState={setCurrentPassword}
        />
        <PasswordField
          name="new_password"
          label="New password"
          placeholder="New password"
          required={true}
          _state={newPassword}
          _setState={setNewPassword}
          errors={newPasswordErrors}
        />
        <PasswordField
          name="new_password_again"
          label="Repeat new password"
          placeholder="Repeat new password"
          required={true}
          _state={newPasswordAgain}
          _setState={setNewPasswordAgain}
        />
        <SubmitField name="Change password" handler={newPasswordHandler} />
      </form>
    </div>
  )
}
export default ChangePasswordPage
