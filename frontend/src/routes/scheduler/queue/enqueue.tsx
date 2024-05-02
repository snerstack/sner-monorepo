import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

import Heading from '@/components/Heading'
import SubmitField from '@/components/fields/SubmitField'
import TextAreaField from '@/components/fields/TextAreaField'

const QueueEnqueuePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [targets, setTargets] = useState<string>('')

  const enqueueHandler = () => {
    const formData = new FormData()
    formData.append('targets', targets)

    httpClient
      .post(urlFor(`/backend/scheduler/queue/enqueue/${id}`), formData)
      .then(() => navigate('/scheduler/queue/list'))
      .catch(() => toast.error('Error while enqueuing'))
  }

  return (
    <div>
      <Helmet>
        <title>Queues / Enqueue - sner4</title>
      </Helmet>

      <Heading headings={['Queues', 'Enqueue']} />
      <form id="queue_enqueue_form" method="post">
        <TextAreaField
          name="targets"
          label="Targets"
          placeholder="Targets"
          rows={10}
          required={true}
          _state={targets}
          _setState={setTargets}
        />

        <SubmitField name="Enqueue" handler={enqueueHandler} />
      </form>
    </div>
  )
}
export default QueueEnqueuePage
