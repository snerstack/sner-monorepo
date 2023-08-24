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

const NoteEditPage = () => {
  const note = useLoaderData() as Note

  const [hostId, setHostId] = useState<number>(note.host_id)
  const [serviceId, setServiceId] = useState<number>(note.service_id || 0)
  const [viaTarget, setViaTarget] = useState<string>(note.via_target)
  const [xtype, setXtype] = useState<string>(note.xtype)
  const [data, setData] = useState<string>(note.data)
  const [tags, setTags] = useState<string[]>(note.tags)
  const [comment, setComment] = useState<string>(note.comment)

  const navigation = useNavigate()

  const editNoteHandler = async () => {
    const formData = new FormData()
    formData.append('host_id', hostId.toString())
    formData.append('service_id', serviceId === 0 ? '' : serviceId.toString())
    formData.append('via_target', viaTarget)
    formData.append('xtype', xtype)
    formData.append('data', data)
    formData.append('tags', tags.join('\n'))
    formData.append('comment', comment)

    try {
      await httpClient.post(env.VITE_SERVER_URL + `/storage/note/edit/${note.id}`, formData)

      navigation(-1)
    } catch (err) {
      toast.error('Error while editing a note.')
    }
  }

  return (
    <div>
      <Heading headings={['Notes', 'Edit']} />
      <form id="service_form" method="post">
        <div className="form-group row">
          <label className="col-sm-2 col-form-label">
            <a data-toggle="collapse" href="#refs_collapse">
              Host, Service
            </a>
          </label>
          <div className="col-sm-10">
            <div className="form-control-plaintext">
              {note.address} {note.hostname && `(${note.hostname})`}{' '}
              {note.service_port > 0 && `${note.service_port}/${note.service_proto}`}
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
          <NumberField
            name="service_id"
            label="Service ID"
            placeholder="Service ID"
            horizontal={true}
            _state={serviceId}
            _setState={setServiceId}
          />
          <TextField
            name="via_target"
            label="Via target"
            placeholder="Via target"
            horizontal={true}
            _state={viaTarget}
            _setState={setViaTarget}
          />
        </div>
        <TextField
          name="xtype"
          label="xType"
          placeholder="xType"
          horizontal={true}
          _state={xtype}
          _setState={setXtype}
        />
        <TextAreaField
          name="data"
          label="Data"
          placeholder="Data"
          rows={10}
          horizontal={true}
          _state={data}
          _setState={setData}
        />
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
        <SubmitField name="Edit" horizontal={true} handler={editNoteHandler} />
      </form>
    </div>
  )
}
export default NoteEditPage
