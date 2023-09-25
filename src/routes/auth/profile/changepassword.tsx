import { isAxiosError } from 'axios'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'

import PasswordField from '@/components/Fields/PasswordField'
import SubmitField from '@/components/Fields/SubmitField'
import Heading from '@/components/Heading'

const ChangePasswordPage = () => {
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [newPasswordAgain, setNewPasswordAgain] = useState<string>('')

  const [currentPasswordErrors, setCurrentPasswordErrors] = useState<string[]>([])
  const [newPasswordErrors, setNewPasswordErrors] = useState<string[]>([])

  const newPasswordHandler = async () => {
    setCurrentPasswordErrors([])
    setNewPasswordErrors([])

    const formData = new FormData()
    formData.append('current_password', currentPassword)
    formData.append('password1', newPassword)
    formData.append('password2', newPasswordAgain)

    try {
      const resp = await httpClient.post<{ message: string }>(
        import.meta.env.VITE_SERVER_URL + '/auth/profile/changepassword',
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
        const message = err.response?.data.error.message

        if (message) return toast.error(message)

        const errors = err.response?.data.error.errors

        setCurrentPasswordErrors(errors?.current_password ?? [])
        setNewPasswordErrors(errors?.password1 ?? [])
      }
    }
  }

  return (
    <div>
      <Helmet>
        <title>User profile / Change password - sner4</title>
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
          errors={currentPasswordErrors}
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
