import { useState } from 'react'

import SubmitField from '@/components/Fields/SubmitField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'

const TOTPPage = () => {
  const [code, setCode] = useState<string>('')

  const totpHandler = () => {}

  return (
    <div>
      <Heading headings={['User profile', '2-factor authentication setup (enable)']} />
      <div>
        To enable two-factor authentication::
        <ol>
          <li>Scan the barcode or add the text seed to your authenticator.</li>
          <li>Verify pairing with one code.</li>
        </ol>
      </div>
      <form id="totp_code_form" method="post">
        {/* {secret && ( */}
        {true && (
          <>
            <div className="form-group row">
              <label className="col-sm-2 col-form-label">Secret</label>
              <div className="col-sm-10">
                <div className="form-control-plaintext">.secret</div>
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-2 col-form-label">Secret QR code</label>
              <div className="col-sm-10">
                <div className="form-control-plaintext">
                  {/* <img id="2faqrcode" /><script>$('#2faqrcode').attr('src', new QRious({value: 'provisioning_url|safe', size: 200}).toDataURL());</script> */}
                </div>
              </div>
            </div>
          </>
        )}
        <TextField
          name="totp_code"
          label="TOTP Code"
          placeholder="TOTP Code"
          required={true}
          horizontal={true}
          _state={code}
          _setState={setCode}
        />
        <SubmitField name="Submit" horizontal={true} handler={totpHandler} />
      </form>
    </div>
  )
}
export default TOTPPage
