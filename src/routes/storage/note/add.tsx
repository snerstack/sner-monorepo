import { unique } from '@/utils'
import { useEffect, useState } from 'react'
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

const NoteAddPage = ({ type }: { type: 'host' | 'service' }) => {
  const loaderData = useLoaderData() as Host & Service

  const [address, setAddress] = useState<string>('')
  const [hostname, setHostname] = useState<string>('')
  const [port, setPort] = useState<number>(0)
  const [proto, setProto] = useState<string>('')
  const [hostId, setHostId] = useState<number>(0)
  const [serviceId, setServiceId] = useState<number>(0)
  const [viaTarget, setViaTarget] = useState<string>('')
  const [xtype, setXtype] = useState<string>('')
  const [data, setData] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState<string>('')

  useEffect(() => {
    if (type === 'host') {
      setAddress(loaderData.address)
      setHostname(loaderData.hostname || '')
      setHostId(loaderData.id)
    } else {
      setAddress(loaderData.address)
      setHostname(loaderData.hostname || '')
      setHostId(loaderData.host_id)
      setPort(loaderData.port)
      setProto(loaderData.proto)
      setServiceId(loaderData.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const navigate = useNavigate()

  const addNoteHandler = async () => {
    const formData = new FormData()
    formData.append('host_id', hostId.toString())
    formData.append('service_id', serviceId === 0 ? '' : serviceId.toString())
    formData.append('via_target', viaTarget)
    formData.append('xtype', xtype)
    formData.append('data', data)
    formData.append('tags', tags.join('\n'))
    formData.append('comment', comment)

    try {
      if (type === 'host') {
        const resp = await httpClient.post<{ host_id: number }>(
          import.meta.env.VITE_SERVER_URL + `/storage/note/add/host/${hostId}`,
          formData,
        )
        navigate(`/storage/host/view/${resp.data.host_id}`)
      } else {
        const resp = await httpClient.post<{ host_id: number }>(
          import.meta.env.VITE_SERVER_URL + `/storage/note/add/service/${serviceId}`,
          formData,
        )
        navigate(`/storage/host/view/${resp.data.host_id}`)
      }

      toast.success('Note has been successfully added.')
    } catch (err) {
      toast.error('Error while adding a note.')
    }
  }

  return (
    <div>
      <Helmet>
        <title>Notes / Add - sner4</title>
      </Helmet>

      <Heading headings={['Notes', 'Add']} />
      <form id="service_form" method="post">
        <div className="form-group row">
          <label className="col-sm-2 col-form-label">
            <a data-toggle="collapse" href="#refs_collapse">
              Host, Service
            </a>
          </label>
          <div className="col-sm-10">
            <div className="form-control-plaintext">
              {address} {hostname && `(${hostname})`} {port > 0 && `${port}/${proto}`}
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
          <NumberField
            name="service_id"
            label="Service ID"
            placeholder="Service ID"
            _state={serviceId}
            _setState={setServiceId}
          />
          <TextField
            name="via_target"
            label="Via target"
            placeholder="Via target"
            _state={viaTarget}
            _setState={setViaTarget}
          />
        </div>
        <TextField name="xtype" label="xType" placeholder="xType" _state={xtype} _setState={setXtype} />
        <TextAreaField name="data" label="Data" placeholder="Data" rows={10} _state={data} _setState={setData} />
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
        <SubmitField name="Add" handler={addNoteHandler} />
      </form>
    </div>
  )
}
export default NoteAddPage
