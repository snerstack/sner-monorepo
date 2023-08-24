import { unique } from '@/utils'
import env from 'app-env'
import { useState } from 'react'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'

import NumberField from '@/components/Fields/NumberField'
import SubmitField from '@/components/Fields/SubmitField'
import TagsField from '@/components/Fields/TagsField'
import TextAreaField from '@/components/Fields/TextAreaField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'

const ServiceAddPage = () => {
  const host = useLoaderData() as Host

  const [hostId, setHostId] = useState<number>(host.id)
  const [proto, setProto] = useState<string>('')
  const [port, setPort] = useState<number>(0)
  const [state, setState] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [info, setInfo] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState<string>('')

  const navigation = useNavigate()

  const addServiceHandler = async () => {
    const formData = new FormData()
    formData.append('host_id', hostId.toString())
    formData.append('proto', proto)
    formData.append('port', port.toString())
    formData.append('state', state)
    formData.append('name', name)
    formData.append('info', info)
    formData.append('tags', tags.join('\n'))
    formData.append('comment', comment)

    try {
      await httpClient.post(env.VITE_SERVER_URL + `/storage/service/add/${host.id}`, formData)

      navigation(-1)
    } catch (err) {
      toast.error('Error while editing a service.')
    }
  }
  return (
    <div>
      <Heading headings={['Services', 'Add']} />
      <form id="service_form" method="post">
        <div className="form-group row">
          <label className="col-sm-2 col-form-label">
            <a data-toggle="collapse" href="#refs_collapse">
              Host
            </a>
          </label>
          <div className="col-sm-10">
            <div className="form-control-plaintext">
              {host.address} {host.hostname && `(${host.hostname})`}
            </div>
          </div>
        </div>
        <div id="refs_collapse" className="collapse">
          <NumberField
            name="host_id"
            label="Host ID"
            placeholder="Host ID"
            required={true}
            horizontal={true}
            _state={hostId}
            _setState={setHostId}
          />
        </div>
        <TextField
          name="proto"
          label="Proto"
          placeholder="Proto"
          required={true}
          horizontal={true}
          _state={proto}
          _setState={setProto}
        />
        <NumberField
          name="port"
          label="Port"
          placeholder="Port"
          required={true}
          horizontal={true}
          _state={port}
          _setState={setPort}
        />
        <TextField
          name="state"
          label="State"
          placeholder="State"
          horizontal={true}
          _state={state}
          _setState={setState}
        />
        <TextField name="name" label="Name" placeholder="Name" horizontal={true} _state={name} _setState={setName} />
        <TextField name="info" label="Info" placeholder="Info" horizontal={true} _state={info} _setState={setInfo} />
        <TagsField
          name="tags"
          label="Tags"
          placeholder="Tags"
          defaultTags={unique([...env.VITE_HOST_TAGS, ...env.VITE_VULN_TAGS, ...env.VITE_ANNOTATE_TAGS]).sort()}
          horizontal={true}
          _state={tags}
          _setState={setTags}
        />
        <TextAreaField
          name="comment"
          label="Comment"
          placeholder="Comment"
          rows={2}
          horizontal={true}
          _state={comment}
          _setState={setComment}
        />
        <SubmitField name="Add" horizontal={true} handler={addServiceHandler} />
      </form>
    </div>
  )
}
export default ServiceAddPage
