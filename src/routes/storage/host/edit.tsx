import { unique } from '@/utils'
import env from 'app-env'
import { useState } from 'react'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'

import SubmitField from '@/components/Fields/SubmitField'
import TagsField from '@/components/Fields/TagsField'
import TextAreaField from '@/components/Fields/TextAreaField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'

const HostEditPage = () => {
  const host = useLoaderData() as Host
  const [address, setAddress] = useState<string>(host.address)
  const [hostname, setHostname] = useState<string>(host.hostname || '')
  const [os, setOs] = useState<string>(host.os || '')
  const [tags, setTags] = useState<string[]>(host.tags)
  const [comment, setComment] = useState<string>(host.comment || '')

  const navigation = useNavigate()

  const editHostHandler = async () => {
    const formData = new FormData()
    formData.append('address', address)
    formData.append('hostname', hostname)
    formData.append('os', os)
    formData.append('tags', tags.join('\n'))
    formData.append('comment', comment)

    try {
      await httpClient.post(env.VITE_SERVER_URL + `/storage/host/edit/${host.id}`, formData)

      navigation(-1)
    } catch (err) {
      toast.error('Error while editing a host.')
    }
  }
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
        <SubmitField name="Edit" horizontal={true} handler={editHostHandler} />
      </form>
    </div>
  )
}
export default HostEditPage
