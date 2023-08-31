import env from 'app-env'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'

import SubmitField from '@/components/Fields/SubmitField'
import TextAreaField from '@/components/Fields/TextAreaField'
import Heading from '@/components/Heading'

const QueueEnqueuePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [targets, setTargets] = useState<string>('')

  const enqueueHandler = () => {
    const formData = new FormData()
    formData.append('targets', targets)

    httpClient
      .post(env.VITE_SERVER_URL + `/scheduler/queue/enqueue/${id}`, formData)
      .then(() => navigate(-1))
      .catch(() => toast.error('Error while enqueuing'))
  }

  return (
    <div>
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
