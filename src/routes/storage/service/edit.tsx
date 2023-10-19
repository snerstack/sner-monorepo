import { unique } from '@/utils'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'

import NumberField from '@/components/Fields/NumberField'
import SubmitField from '@/components/Fields/SubmitField'
import TagsField from '@/components/Fields/TagsField'
import TextAreaField from '@/components/Fields/TextAreaField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'

const ServiceEditPage = () => {
  const service = useLoaderData() as Service

  const [hostId, setHostId] = useState<number>(service.host_id)
  const [proto, setProto] = useState<string>(service.proto)
  const [port, setPort] = useState<number>(service.port)
  const [state, setState] = useState<string>(service.state || '')
  const [name, setName] = useState<string>(service.name || '')
  const [info, setInfo] = useState<string>(service.info || '')
  const [tags, setTags] = useState<string[]>(service.tags)
  const [comment, setComment] = useState<string>(service.comment || '')

  const navigate = useNavigate()

  const editServiceHandler = async () => {
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
      const resp = await httpClient.post<{ message: string }>(
        import.meta.env.VITE_SERVER_URL + `/storage/service/edit/${service.id}`,
        formData,
      )

      navigate(-1)

      toast.success(resp.data.message)
    } catch (err) {
      toast.error('Error while editing a service.')
    }
  }

  return (
    <div>
      <Helmet>
        <title>Services / Edit - sner4</title>
      </Helmet>
      <Heading headings={['Services', 'Edit']} />
      <form id="service_form" method="post">
        <div className="form-group row">
          <label className="col-sm-2 col-form-label">
            <a data-toggle="collapse" href="#refs_collapse">
              Host
            </a>
          </label>
          <div className="col-sm-10">
            <div className="form-control-plaintext">
              {service.address} {service.hostname && `(${service.hostname})`}
            </div>
          </div>
        </div>
        <div id="refs_collapse" className="collapse">
          <NumberField
            name="host_id"
            label="Host ID"
            placeholder="Host ID"
            required={true}
            _state={hostId}
            _setState={setHostId}
          />
        </div>
        <TextField name="proto" label="Proto" placeholder="Proto" required={true} _state={proto} _setState={setProto} />
        <NumberField name="port" label="Port" placeholder="Port" required={true} _state={port} _setState={setPort} />
        <TextField name="state" label="State" placeholder="State" _state={state} _setState={setState} />
        <TextField name="name" label="Name" placeholder="Name" _state={name} _setState={setName} />
        <TextField name="info" label="Info" placeholder="Info" _state={info} _setState={setInfo} />
        <TagsField
          name="tags"
          label="Tags"
          placeholder="Tags"
          defaultTags={unique([
            ...import.meta.env.VITE_HOST_TAGS.split(','),
            ...import.meta.env.VITE_VULN_TAGS.split(','),
            ...import.meta.env.VITE_ANNOTATE_TAGS.split(','),
          ]).sort()}
          _state={tags}
          _setState={setTags}
        />
        <TextAreaField
          name="comment"
          label="Comment"
          placeholder="Comment"
          rows={2}
          _state={comment}
          _setState={setComment}
        />
        <SubmitField name="Edit" handler={editServiceHandler} />
      </form>
    </div>
  )
}
export default ServiceEditPage
