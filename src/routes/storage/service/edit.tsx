import NumberField from '@/components/Fields/NumberField'
import SubmitField from '@/components/Fields/SubmitField'
import TagsField from '@/components/Fields/TagsField'
import TextAreaField from '@/components/Fields/TextAreaField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'
import { useState } from 'react'

const ServiceEditPage = () => {
  const [address, setAddress] = useState<string>('')
  const [hostname, setHostname] = useState<string>('')
  const [hostId, setHostId] = useState<number | null>(null)
  const [proto, setProto] = useState<string>('')
  const [port, setPort] = useState<number | null>(null)
  const [state, setState] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [info, setInfo] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState<string>('')

  const editServiceHandler = () => {}
  return (
    <div>
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
              {address} ({hostname})
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
        <SubmitField name="Edit" horizontal={true} handler={editServiceHandler} />
      </form>
    </div>
  )
}
export default ServiceEditPage
