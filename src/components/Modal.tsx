import { ReactElement } from 'react'
import { ModalBody, ModalTitle } from 'react-bootstrap'
import BootstrapModal from 'react-bootstrap/Modal'
import ModalHeader from 'react-bootstrap/esm/ModalHeader'
import { useRecoilState } from 'recoil'

import { modalState } from '@/atoms/modalAtom'

const Modal = ({ title, children }: { title: string; children: ReactElement | ReactElement[] }) => {
  const [show, setShow] = useRecoilState(modalState)

  return (
    <BootstrapModal show={show} onHide={() => setShow(false)}>
      <ModalHeader>
        <ModalTitle>{title}</ModalTitle>
      </ModalHeader>
      <ModalBody>{children}</ModalBody>
    </BootstrapModal>
  )
}
export default Modal
