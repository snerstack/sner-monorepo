import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { handleHttpClientError, httpClient } from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

import Heading from '@/components/Heading'
import BooleanField from '@/components/fields/BooleanField'
import NumberField from '@/components/fields/NumberField'
import SubmitField from '@/components/fields/SubmitField'
import TagsField from '@/components/fields/TagsField'
import TextAreaField from '@/components/fields/TextAreaField'
import TextField from '@/components/fields/TextField'

const QueueAddPage = () => {
  const navigate = useNavigate()

  const [name, setName] = useState<string>('')
  const [config, setConfig] = useState<string>('')
  const [groupSize, setGroupSize] = useState<number>(1)
  const [priority, setPriority] = useState<number>(0)
  const [active, setActive] = useState<boolean>(false)
  const [requirements, setRequirements] = useState<string[]>([])

  const addQueueHandler = async () => {
    const formData = new FormData()
    formData.append('name', name)
    formData.append('config', config)
    formData.append('group_size', groupSize.toString())
    formData.append('priority', priority.toString())
    formData.append('active', active ? 'true' /* c8 ignore next */: 'false')
    formData.append('reqs', requirements.join('\n'))

    try {
      const resp = await httpClient.post<{ message: string }>(
        urlFor('/backend/scheduler/queue/add'),
        formData,
      )

      toast.success(resp.data.message)
      navigate('/scheduler/queue/list')
    } catch (err) {
      handleHttpClientError(err)
    }
  }

  return (
    <div>
      <Helmet>
        <title>Queues / Add - SNER</title>
      </Helmet>
      <Heading headings={['Queues', 'Add']} />
      <form id="queue_form" method="post">
        <TextField
          name="name"
          label="Name"
          placeholder="Name"
          required={true}
          _state={name}
          _setState={setName}
        />
        <TextAreaField
          name="config"
          label="Config"
          placeholder="Config"
          rows={10}
          _state={config}
          _setState={setConfig}
        />
        <NumberField
          name="group_size"
          label="Group size"
          placeholder="Group size"
          minValue={1}
          required={true}
          _state={groupSize}
          _setState={setGroupSize}
        />
        <NumberField
          name="priority"
          label="Priority"
          placeholder="Priority"
          minValue={1}
          required={true}
          _state={priority}
          _setState={setPriority}
        />
        <BooleanField name="active" label="Active" _state={active} _setState={setActive} />
        <TagsField
          name="requirements"
          label="Requirements"
          placeholder="Requirements"
          _state={requirements}
          _setState={setRequirements}
        />
        <SubmitField name="Add" handler={addQueueHandler} />
      </form>
    </div>
  )
}
export default QueueAddPage
