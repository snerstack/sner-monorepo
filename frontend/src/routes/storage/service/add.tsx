import { unique } from '@/utils'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useRecoilState } from 'recoil'

import { handleHttpClientError, httpClient } from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'
import { appConfigState } from '@/atoms/appConfigAtom'

import Heading from '@/components/Heading'
import NumberField from '@/components/fields/NumberField'
import SubmitField from '@/components/fields/SubmitField'
import TagsField from '@/components/fields/TagsField'
import TextAreaField from '@/components/fields/TextAreaField'
import TextField from '@/components/fields/TextField'

const ServiceAddPage = () => {
  const [appConfig, ] = useRecoilState(appConfigState)
  const host = useLoaderData() as Host

  const [hostId, setHostId] = useState<number>(host.id)
  const [proto, setProto] = useState<string>('')
  const [port, setPort] = useState<number>(0)
  const [state, setState] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [info, setInfo] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState<string>('')

  const navigate = useNavigate()

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
      const resp = await httpClient.post<{ host_id: number }>(
        urlFor(`/backend/storage/service/add/${host.id}`),
        formData,
      )

      navigate(`/storage/host/view/${resp.data.host_id}`)

      toast.success('Successfully added a new service.')
    } catch (err) {
      handleHttpClientError(err)
    }
  }
  return (
    <div>
      <Helmet>
        <title>Services / Add - SNER</title>
      </Helmet>

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
            ...appConfig.tags.host,
            ...appConfig.tags.service,
            ...appConfig.tags.vuln,
            ...appConfig.tags.annotate,
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
        <SubmitField name="Add" handler={addServiceHandler} />
      </form>
    </div>
  )
}
export default ServiceAddPage
