import { Dispatch, SetStateAction, useState } from 'react'
import { Modal, ModalBody, ModalTitle } from 'react-bootstrap'

import { getTableApi } from '@/lib/DataTables'
import { handleHttpClientError, httpClient } from '@/lib/httpClient'
import { DEFAULT_MULTIPLE_TAG_STATE, getSelectedIds } from '@/lib/sner/storage'

import SubmitField from '../fields/SubmitField'
import TagsField from '../fields/TagsField'

const MultipleTagModal = ({
  multipleTag,
  setMultipleTag,
}: {
  multipleTag: MultipleTag
  setMultipleTag: Dispatch<SetStateAction<MultipleTag>>
}) => {
  const [tags, setTags] = useState<string[]>([])

  const multipleTagHandler = async () => {
    const ids = getSelectedIds(getTableApi(multipleTag.tableId))

    const payload = {
      ids,
      tags,
      action: multipleTag.action,
    }

    try {
      await httpClient.post(multipleTag.url, payload)
      setMultipleTag(DEFAULT_MULTIPLE_TAG_STATE)
      getTableApi(multipleTag.tableId).draw()
      /* c8 ignore next 3 */
    } catch (err) {
      handleHttpClientError(err)
    }
  }

  return (
    <Modal
      show={multipleTag.show}
      onHide={() => setMultipleTag(DEFAULT_MULTIPLE_TAG_STATE)}
      size="lg"
      data-testid="multiple-tag-modal"
    >
      <Modal.Header>
        <ModalTitle>{`${multipleTag.action === 'set' ? 'Tag' : 'Untag'} multiple items`}</ModalTitle>
      </Modal.Header>
      <ModalBody>
        <TagsField name="tags" label="Tags" placeholder="Tags" _state={tags} _setState={setTags} horizontal={false} />

        <SubmitField name="Save" horizontal={false} handler={multipleTagHandler} />
      </ModalBody>
    </Modal>
  )
}
export default MultipleTagModal
