import BooleanField from '@/components/Fields/BooleanField'
import NumberField from '@/components/Fields/NumberField'
import SubmitField from '@/components/Fields/SubmitField'
import TextAreaField from '@/components/Fields/TextAreaField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'
import { useState } from 'react'

const QueueAddPage = () => {
  const [name, setName] = useState<string>('')
  const [config, setConfig] = useState<string>('')
  const [groupSize, setGroupSize] = useState<number | null>(1)
  const [priority, setPriority] = useState<number | null>(null)
  const [active, setActive] = useState<boolean>(false)
  const [requirements, setRequirements] = useState<string>('')

  const addQueueHandler = () => {}

  return (
    <div>
      <Heading headings={['Queues', 'Add']} />
      <form id="queue_form" method="post">
        {/* {{ form.csrf_token }}*/}
        {/* <input id="csrf_token" name="csrf_token" type="hidden" value="random-csrf-value-4654654" /> */}
        <TextField
          name="name"
          label="Name"
          placeholder="Name"
          horizontal={true}
          required={true}
          _state={name}
          _setState={setName}
        />
        <TextAreaField
          name="config"
          label="Config"
          placeholder="Config"
          rows={10}
          horizontal={true}
          _state={config}
          _setState={setConfig}
        />
        <NumberField
          name="group_size"
          label="Group size"
          placeholder="Group size"
          minValue={1}
          horizontal={true}
          required={true}
          _state={groupSize}
          _setState={setGroupSize}
        />
        <NumberField
          name="priority"
          label="Priority"
          placeholder="Priority"
          minValue={1}
          horizontal={true}
          required={true}
          _state={priority}
          _setState={setPriority}
        />
        <BooleanField name="active" label="Active" horizontal={true} _state={active} _setState={setActive} />
        <TextField
          name="requirements"
          label="Requirements"
          placeholder="Requirements"
          horizontal={true}
          _state={requirements}
          _setState={setRequirements}
        />
        <SubmitField name="Add" horizontal={true} handler={addQueueHandler} />
      </form>
    </div>
  )
}
export default QueueAddPage
