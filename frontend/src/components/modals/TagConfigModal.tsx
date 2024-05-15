import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { ModalBody, ModalTitle } from 'react-bootstrap'
import Modal from 'react-bootstrap/Modal'
import { HexColorInput, HexColorPicker } from 'react-colorful'

import { Config } from '../../../config.ts'
import { LSKEY_TAG_COLORS, invertColor } from '@/lib/sner/tags'

import SubmitField from '../fields/SubmitField'

export type TagConfigModalData = {
  tag: string;
  color: string;
  show: boolean;
}

const TagConfigModal = (
  {
    modalData,
    setModalData
  }:
  {
    modalData: TagConfigModalData,
    setModalData: Dispatch<SetStateAction<TagConfigModalData>>
}) => {
  const [color, setColor] = useState<string>(modalData.color)
  const isPrefix = modalData.tag.includes(':')

  useEffect(() => {
    setColor(modalData.color)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalData.show])

  const tagConfigHandler = () => {
    const colorsConfig = JSON.parse(localStorage.getItem(LSKEY_TAG_COLORS)!) as Config['tags']['colors']
    colorsConfig[modalData.tag] = color

    localStorage.setItem(LSKEY_TAG_COLORS, JSON.stringify(colorsConfig))
    setModalData({ ...modalData, show: false })
  }

  return (
    <Modal
      show={modalData.show}
      onHide={() => setModalData({ ...modalData, show: false })}
      size="sm"
      data-testid="tag-config-modal"
    >
      <Modal.Header>
        <ModalTitle>Tag Configuration</ModalTitle>
      </Modal.Header>
      <ModalBody className="d-flex flex-column align-items-center">
        <div>
          {/* c8 ignore next 1 */}
          <label>Change color for {isPrefix ? 'prefix' : 'tag'}</label>{' '}
          <span style={{ background: color, color: invertColor(color) }} className="badge tag-badge">
            {modalData.tag}
          </span>
        </div>{' '}
        <div className="mt-2 mb-4">
          <HexColorPicker data-testid="tag-color-picker" color={color} onChange={(c) => setColor(c)} className="mb-2" />
          <HexColorInput
            data-testid="tag-color-input"
            prefixed={true}
            color={color}
            onChange={(c) => {
              setColor(c)
            }}
          />
        </div>
        <SubmitField name="Change" horizontal={false} handler={tagConfigHandler} />
      </ModalBody>
    </Modal>
  )
}
export default TagConfigModal
