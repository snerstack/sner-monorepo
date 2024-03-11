import { unique } from '@/utils'
import { Dispatch, SetStateAction, useState } from 'react'
import { Modal, ModalBody, ModalTitle } from 'react-bootstrap'
import { toast } from 'react-toastify'

import { getTableApi } from '@/lib/DataTables'
import httpClient from '@/lib/httpClient'

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
      .post(import.meta.env.VITE_SERVER_URL + annotate.url, formData)
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
      <Modal.Header placeholder="Annotate">
        <ModalTitle>Annotate</ModalTitle>
      </Modal.Header>
      <ModalBody>
        <TagsField
          name="tags"
          label="Tags"
          placeholder="Tags"
          _state={tags.length === 0 ? annotate.tags : tags}
          _setState={setTags}
          defaultTags={unique([
            ...import.meta.env.VITE_HOST_TAGS.split(','),
            ...import.meta.env.VITE_VULN_TAGS.split(','),
            ...import.meta.env.VITE_ANNOTATE_TAGS.split(','),
          ]).sort()}
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
