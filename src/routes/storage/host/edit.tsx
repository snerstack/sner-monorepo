import SubmitField from '@/components/Fields/SubmitField'
import TagsField from '@/components/Fields/TagsField'
import TextAreaField from '@/components/Fields/TextAreaField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'
import { useState } from 'react'

const HostEditPage = () => {
  const [address, setAddress] = useState<string>('')
  const [hostname, setHostname] = useState<string>('')
  const [os, setOs] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState<string>('')

  const editHostHandler = () => {}
  return (
    <div>
      <Heading headings={['Hosts', 'Edit']} />
      <form id="host_form" method="post">
        <TextField
          name="address"
          label="Address"
          placeholder="Address"
          required={true}
          horizontal={true}
          _state={address}
          _setState={setAddress}
        />
        <TextField
          name="hostname"
          label="Hostname"
          placeholder="Hostname"
          horizontal={true}
          _state={hostname}
          _setState={setHostname}
        />
        <TextField name="os" label="Os" placeholder="Os" horizontal={true} _state={os} _setState={setOs} />
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
        <SubmitField name="Edit" horizontal={true} handler={editHostHandler} />
      </form>
    </div>
  )
}
export default HostEditPage
