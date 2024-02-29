import { unique } from '@/utils'
import { Dispatch, SetStateAction, useState } from 'react'
import { Modal, ModalBody, ModalTitle } from 'react-bootstrap'
import { toast } from 'react-toastify'

import { getTableApi } from '@/lib/DataTables'
import httpClient from '@/lib/httpClient'

import config from '../../../config.ts'
import SubmitField from '../fields/SubmitField'
import TagsField from '../fields/TagsField'
import TextAreaField from '../fields/TextAreaField'

const AnnotateModal = ({
  annotate,
  setAnnotate,
}: {
  annotate: Annotate
  setAnnotate: Dispatch<SetStateAction<Annotate>>
}) => {
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState<string>('')

  const annotateHandler = () => {
    const formData = new FormData()
    formData.append('tags', tags.join('\n'))
    formData.append('comment', comment)

    httpClient
      .post(annotate.url, formData)
      .then(() => {
        setAnnotate({ ...annotate, show: false })
        if (annotate.tableId) {
          getTableApi(annotate.tableId).draw()
        }
      })
      .catch(() => toast.error('Error while annotating'))
  }

  return (
    <Modal
      show={annotate.show}
      onHide={() => setAnnotate({ ...annotate, show: false })}
      size="lg"
      data-testid="annotate-modal"
    >
      <Modal.Header>
        <ModalTitle>Annotate</ModalTitle>
      </Modal.Header>
      <ModalBody>
        <TagsField
          name="tags"
          label="Tags"
          placeholder="Tags"
          _state={tags.length === 0 ? annotate.tags : tags}
          _setState={setTags}
          defaultTags={unique([...config.tags.host, ...config.tags.vuln, ...config.tags.annotate]).sort()}
        />{' '}
        <TextAreaField
          name="comment"
          label="Comment"
          placeholder="Comment"
          rows={2}
          _state={comment === '' ? annotate.comment : comment}
          _setState={setComment}
        />
        <SubmitField name="Save" handler={annotateHandler} />
      </ModalBody>
    </Modal>
  )
}
export default AnnotateModal
