import { unique } from '@/utils'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { Modal, ModalBody, ModalTitle } from 'react-bootstrap'
import { useRecoilState } from 'recoil'

import { appConfigState } from '@/atoms/appConfigAtom'
import { getTableApi } from '@/lib/DataTables'
import { handleHttpClientError, httpClient } from '@/lib/httpClient'

import { DEFAULT_ANNOTATE_STATE } from '@/lib/sner/storage.ts'
import SubmitField from '@/components/fields/SubmitField'
import TagsField from '@/components/fields/TagsField'
import TextAreaField from '@/components/fields/TextAreaField'

const AnnotateModal = ({
  annotate,
  setAnnotate,
}: {
  annotate: Annotate
  setAnnotate: Dispatch<SetStateAction<Annotate>>
}) => {
  const [appConfig, ] = useRecoilState(appConfigState)

  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState<string>('')

  useEffect(() => {
    setTags(annotate.tags)
    setComment(annotate.comment)
  }, [annotate.tags, annotate.comment])

  const annotateHandler = async (): Promise<void> => {
    const formData = new FormData()
    formData.append('tags', tags.join('\n'))
    formData.append('comment', comment)

    try {
      await httpClient.post(annotate.url, formData)
      setAnnotate({ ...annotate, show: false })
      annotate.tableId && getTableApi(annotate.tableId).draw()
      annotate.refresh && annotate.refresh(tags, comment)
    } catch (err) {
      handleHttpClientError(err)
    }
  }

  return (
    <Modal
      show={annotate.show}
      onHide={() => setAnnotate(DEFAULT_ANNOTATE_STATE)}
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
          _state={tags}
          _setState={setTags}
          defaultTags={unique([...appConfig.tags.host, ...appConfig.tags.vuln, ...appConfig.tags.annotate]).sort()}
        />{' '}
        <TextAreaField
          name="comment"
          label="Comment"
          placeholder="Comment"
          rows={2}
          _state={comment}
          _setState={setComment}
        />
        <SubmitField name="Save" handler={annotateHandler} />
      </ModalBody>
    </Modal>
  )
}
export default AnnotateModal
