import SubmitField from '@/components/Fields/SubmitField'
import TextAreaField from '@/components/Fields/TextAreaField'
import Heading from '@/components/Heading'
import { useState } from 'react'

const QueueEnqueuePage = () => {
  const [targets, setTargets] = useState<string>('')

  const enqueueHandler = () => {}

  return (
    <div>
      <Heading headings={['Queues', 'Enqueue']} />
      <form id="queue_enqueue_form" method="post">
        {/* {{ form.csrf_token }}*/}
        {/* <input id="csrf_token" name="csrf_token" type="hidden" value="random-csrf-value-4654654" /> */}
        <TextAreaField
          name="targets"
          label="Targets"
          placeholder="Targets"
          rows={10}
          required={true}
          horizontal={true}
          _state={targets}
          _setState={setTargets}
        />

        <SubmitField name="Enqueue" horizontal={true} handler={enqueueHandler} />
      </form>
    </div>
  )
}
export default QueueEnqueuePage
