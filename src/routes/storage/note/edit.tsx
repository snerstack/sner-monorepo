import NumberField from '@/components/Fields/NumberField'
import SubmitField from '@/components/Fields/SubmitField'
import TagsField from '@/components/Fields/TagsField'
import TextAreaField from '@/components/Fields/TextAreaField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'
import { useState } from 'react'

const NoteEditPage = () => {
  const [address, setAddress] = useState<string>('')
  const [hostname, setHostname] = useState<string>('')
  const [port, setPort] = useState<number | null>(null)
  const [proto, setProto] = useState<string>('')
  const [hostId, setHostId] = useState<number | null>(null)
  const [serviceId, setServiceId] = useState<number | null>(null)
  const [viaTarget, setViaTarget] = useState<string>('')
  const [xtype, setXtype] = useState<string>('')
  const [data, setData] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState<string>('')

  const editNoteHandler = () => {}

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
              {address} ({hostname}) {port && port + '/' + proto}
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
          defaultTags={['Falsepositive', 'Info', 'Report', 'Report:data', 'Reviewed', 'Sslhell', 'Todo']}
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
