import { unique } from '@/utils'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useRecoilState } from 'recoil'

import { appConfigState } from '@/atoms/appConfigAtom'
import httpClient from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

import Heading from '@/components/Heading'
import NumberField from '@/components/fields/NumberField'
import SubmitField from '@/components/fields/SubmitField'
import TagsField from '@/components/fields/TagsField'
import TextAreaField from '@/components/fields/TextAreaField'
import TextField from '@/components/fields/TextField'

const NoteEditPage = () => {
  const [appConfig, ] = useRecoilState(appConfigState)
  const note = useLoaderData() as Note

  const [hostId, setHostId] = useState<number>(note.host_id)
  const [serviceId, setServiceId] = useState<number>(note.service_id || 0)
  const [viaTarget, setViaTarget] = useState<string>(note.via_target || '')
  const [xtype, setXtype] = useState<string>(note.xtype)
  const [data, setData] = useState<string>(note.data)
  const [tags, setTags] = useState<string[]>(note.tags)
  const [comment, setComment] = useState<string>(note.comment || '')

  const navigate = useNavigate()

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
      const resp = await httpClient.post<{ message: string }>(
        urlFor(`/storage/note/edit/${note.id}`),
        formData,
      )

      navigate(-1)

      toast.success(resp.data.message)
    } catch (err) {
      toast.error('Error while editing a note.')
    }
  }

  return (
    <div>
      <Helmet>
        <title>Notes / Edit - sner4</title>
      </Helmet>

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
          defaultTags={unique([...appConfig.tags.host, ...appConfig.tags.vuln, ...appConfig.tags.annotate]).sort()}
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
        <SubmitField name="Edit" handler={editNoteHandler} />
      </form>
    </div>
  )
}
export default NoteEditPage
