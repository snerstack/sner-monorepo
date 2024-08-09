import { unique } from '@/utils'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useRecoilState } from 'recoil'

import { appConfigState } from '@/atoms/appConfigAtom'
import httpClient from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

import Heading from '@/components/Heading'
import SubmitField from '@/components/fields/SubmitField'
import TagsField from '@/components/fields/TagsField'
import TextAreaField from '@/components/fields/TextAreaField'
import TextField from '@/components/fields/TextField'

const HostAddPage = () => {
  const [appConfig,] = useRecoilState(appConfigState)

  const [address, setAddress] = useState<string>('')
  const [hostname, setHostname] = useState<string>('')
  const [os, setOs] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState<string>('')

  const navigate = useNavigate()

  const addHostHandler = async () => {
    const formData = new FormData()
    formData.append('address', address)
    formData.append('hostname', hostname)
    formData.append('os', os)
    formData.append('tags', tags.join('\n'))
    formData.append('comment', comment)

    try {
      const resp = await httpClient.post<{ host_id: number }>(
        urlFor(`/backend/storage/host/add`),
        formData,
      )

      navigate(`/storage/host/view/${resp.data.host_id}`)

      toast.success('Successfully added a new host.')
    } catch (err) {
      toast.error('Error while adding a host.')
    }
  }
  return (
    <div>
      <Helmet>
        <title>Hosts / Add - SNER</title>
      </Helmet>
      <Heading headings={['Hosts', 'Add']} />
      <form id="host_form" method="post">
        <TextField
          name="address"
          label="Address"
          placeholder="Address"
          required={true}
          _state={address}
          _setState={setAddress}
        />
        <TextField name="hostname" label="Hostname" placeholder="Hostname" _state={hostname} _setState={setHostname} />
        <TextField name="os" label="Os" placeholder="Os" _state={os} _setState={setOs} />
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
        <SubmitField name="Add" handler={addHostHandler} />
      </form>
    </div>
  )
}
export default HostAddPage
