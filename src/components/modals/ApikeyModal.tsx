import { ModalBody, ModalTitle } from 'react-bootstrap'
import Modal from 'react-bootstrap/Modal'
import ModalHeader from 'react-bootstrap/esm/ModalHeader'
import { useRecoilState } from 'recoil'

import { apikeyModalState } from '@/atoms/apikeyModalAtom'

const ApikeyModal = () => {
  const [apikeyModal, setApikeyModal] = useRecoilState(apikeyModalState)

  return (
    <Modal
      show={apikeyModal.show}
      onHide={() => setApikeyModal({ show: false, apikey: '' })}
      size="lg"
      data-testid="apikey-modal"
    >
      <ModalHeader>
        <ModalTitle>Apikey</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p>API key: {apikeyModal.apikey}</p>
      </ModalBody>
    </Modal>
  )
}
export default ApikeyModal
