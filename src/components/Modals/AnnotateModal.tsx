import { unique } from '@/utils'
import env from 'app-env'
import { Dispatch, SetStateAction, useState } from 'react'
import { ModalBody, ModalTitle } from 'react-bootstrap'
import Modal from 'react-bootstrap/Modal'
import ModalHeader from 'react-bootstrap/esm/ModalHeader'
import { toast } from 'react-toastify'

import { getTableApi } from '@/lib/DataTables'
import httpClient from '@/lib/httpClient'

import SubmitField from '../Fields/SubmitField'
import TagsField from '../Fields/TagsField'
import TextAreaField from '../Fields/TextAreaField'

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
      .post(env.VITE_SERVER_URL + annotate.url, formData)
      .then(() => {
        setAnnotate({ ...annotate, show: false })
        getTableApi(annotate.tableId).draw()
      })
      .catch(() => toast.error('Error while annotating'))
  }

  return (
    <Modal show={annotate.show} onHide={() => setAnnotate({ ...annotate, show: false })} size="lg">
      <ModalHeader>
        <ModalTitle>Annotate</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <TagsField
          name="tags"
          label="Tags"
          placeholder="Tags"
          _state={tags.length === 0 ? annotate.tags : tags}
          _setState={setTags}
          defaultTags={unique([...env.VITE_HOST_TAGS, ...env.VITE_VULN_TAGS, ...env.VITE_ANNOTATE_TAGS]).sort()}
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
