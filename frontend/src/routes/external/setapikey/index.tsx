import { Helmet } from 'react-helmet-async'
import { toast } from 'react-toastify'
import { useRecoilState } from 'recoil'

import { apikeyState } from '@/atoms/apikeyAtom'

import Heading from '@/components/Heading'
import PasswordField from '@/components/fields/PasswordField'
import SubmitField from '@/components/fields/SubmitField'

const SetApiKeyPage = () => {
  const [apikey, setApikey] = useRecoilState(apikeyState)

  return (
    <div>
      <Helmet>
        <title>External / Service - sner4</title>
      </Helmet>
      <Heading headings={['External', 'Set API key']}>
        <div className="breadcrumb-buttons pl-2"></div>
      </Heading>
      <div>
        <PasswordField _state={apikey} _setState={setApikey} name="apikey" label="API key" placeholder="" required />
        <SubmitField
          handler={() => {
            toast.success('API key successfully set.')
          }}
          name="Set apikey"
        />
      </div>
    </div>
  )
}
export default SetApiKeyPage
