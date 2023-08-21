import Heading from '@/components/Heading'

const WebAuthnLoginPage = () => {
  return (
    <div>
      <Heading headings={['WebAuthn Login']} />
      <div>
        To login with registered Webauthn authenticator
        <ol>
          <li>Insert/connect the authenticator and verify user presence.</li>
          <li>If authenticator gets rejected, refresh the page and try again.</li>
          <li>If none of you authenticator works, login normaly with password.</li>
        </ol>
      </div>

      <form id="webauthn_login_form" method="post">
        {/* {{ bwtf.bootstrap_field(form.assertion, horizontal=True) }} */}
      </form>
    </div>
  )
}
export default WebAuthnLoginPage
