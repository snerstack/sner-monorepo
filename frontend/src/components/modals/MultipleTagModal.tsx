import { Dispatch, SetStateAction, useState } from 'react'
import { Modal, ModalBody, ModalTitle } from 'react-bootstrap'
import { toast } from 'react-toastify'

import { getTableApi } from '@/lib/DataTables'
import httpClient from '@/lib/httpClient'
import { EMPTY_MULTIPLE_TAG_ANNOTATION_STATE, getSelectedIdsFormData } from '@/lib/sner/storage'

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
    const ids = getSelectedIdsFormData(getTableApi(multipleTag.tableId))
    const formData = new FormData()

    formData.append('tag', tags.join('\n'))
    formData.append('action', multipleTag.action)
    for (const key in ids) {
      formData.append(key, ids[key].toString())
    }

    try {
      await httpClient.post(multipleTag.url, formData)
      setMultipleTag(EMPTY_MULTIPLE_TAG_ANNOTATION_STATE)
      getTableApi(multipleTag.tableId).draw()
    /* c8 ignore next 3 */
    } catch {
      toast.error(`Error while ${multipleTag.action}ing tags`)
    }
  }

  return (
    <Modal
      show={multipleTag.show}
      onHide={() => setMultipleTag(EMPTY_MULTIPLE_TAG_ANNOTATION_STATE)}
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
