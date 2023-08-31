import { useState } from 'react'

import PasswordField from '@/components/Fields/PasswordField'
import SubmitField from '@/components/Fields/SubmitField'
import Heading from '@/components/Heading'

const ChangePasswordPage = () => {
  const [currentPassword, setCurrentPassword] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [newPasswordAgain, setNewPasswordAgain] = useState<string>('')

  const newPasswordHandler = () => {}

  return (
    <div>
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
