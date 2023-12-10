import { Dispatch, SetStateAction, useState } from 'react'
import { Modal, ModalBody, ModalTitle } from 'react-bootstrap'
import { toast } from 'react-toastify'

import { getTableApi } from '@/lib/DataTables'
import httpClient from '@/lib/httpClient'
import { getSelectedIdsFormData } from '@/lib/sner/storage'

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
  const multipleTagHandler = () => {
    const ids = getSelectedIdsFormData(getTableApi(multipleTag.tableId))
    const formData = new FormData()

    formData.append('tag', tags.join('\n'))
    formData.append('action', multipleTag.action)
    for (const key in ids) {
      formData.append(key, ids[key].toString())
    }

    httpClient
      .post(import.meta.env.VITE_SERVER_URL + multipleTag.url, formData)
      .then(() => {
        setMultipleTag({ ...multipleTag, show: false })
        getTableApi(multipleTag.tableId).draw()
      })
      .catch(() => toast.error(`Error while ${multipleTag.action}ting tags`))
  }

  return (
    <Modal
      show={multipleTag.show}
      onHide={() => setMultipleTag({ ...multipleTag, show: false })}
      size="lg"
      data-testid="multiple-tag-modal"
    >
      <Modal.Header placeholder={multipleTag.action == 'set' ? 'Tag multiple items' : 'Untag multiple items'}>
        <ModalTitle>{multipleTag.action === 'set' ? 'Tag multiple items' : 'Untag multiple items'}</ModalTitle>
      </Modal.Header>
      <ModalBody>
        <TagsField name="tags" label="Tags" placeholder="Tags" _state={tags} _setState={setTags} horizontal={false} />

        <SubmitField name="Save" horizontal={false} handler={multipleTagHandler} />
      </ModalBody>
    </Modal>
  )
}
export default MultipleTagModal
