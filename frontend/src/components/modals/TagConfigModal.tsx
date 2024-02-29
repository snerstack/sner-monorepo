import { invertColor } from '@/utils'
import { useTagConfig } from '@/zustandHooks/useTagConfig'
import { useEffect, useState } from 'react'
import { ModalBody, ModalTitle } from 'react-bootstrap'
import Modal from 'react-bootstrap/Modal'
import { HexColorInput, HexColorPicker } from 'react-colorful'

import { getTableApi } from '@/lib/DataTables'

import { Config } from '../../../config.ts'
import SubmitField from '../fields/SubmitField'

const TagConfigModal = ({ tableId }: { tableId: string }) => {
  const { tagConfig, setTagConfig } = useTagConfig()
  const [color, setColor] = useState<string>(tagConfig.color)
  const prefix = tagConfig.tag.split(':').length > 1 ? tagConfig.tag.split(':')[0] : ''

  useEffect(() => {
    setColor(tagConfig.color)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagConfig.show])

  const tagConfigHandler = () => {
    const tags = JSON.parse(localStorage.getItem('tags')!) as Config['tags']['colors']

    if (prefix) {
      tags.prefixes[prefix] = color
    } else {
      tags.tags[tagConfig.tag] = color
    }

    localStorage.setItem('tags', JSON.stringify(tags))

    getTableApi(tableId).draw()
    setTagConfig({ ...tagConfig, show: false })
  }

  return (
    <Modal
      show={tagConfig.show}
      onHide={() => setTagConfig({ ...tagConfig, show: false })}
      size="sm"
      data-testid="tag-config-modal"
    >
      <Modal.Header>
        <ModalTitle>Tags Configuration</ModalTitle>
      </Modal.Header>
      <ModalBody className="d-flex flex-column align-items-center">
        <div>
          <label>Change color of {prefix ? 'prefix' : 'tag'}</label>{' '}
          <span style={{ background: color, color: invertColor(color) }} className="badge tag-badge">
            {tagConfig.tag}
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
