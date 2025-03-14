import { unique } from '@/utils'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useRecoilState } from 'recoil'

import { appConfigState } from '@/atoms/appConfigAtom'
import { handleHttpClientError, httpClient } from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

import Heading from '@/components/Heading'
import SubmitField from '@/components/fields/SubmitField'
import TagsField from '@/components/fields/TagsField'
import TextAreaField from '@/components/fields/TextAreaField'
import TextField from '@/components/fields/TextField'

const HostEditPage = () => {
  const [appConfig,] = useRecoilState(appConfigState)
  const host = useLoaderData() as Host

  const [address, setAddress] = useState<string>(host.address)
  const [hostname, setHostname] = useState<string>(host.hostname || '')
  const [os, setOs] = useState<string>(host.os || '')
  const [tags, setTags] = useState<string[]>(host.tags)
  const [comment, setComment] = useState<string>(host.comment || '')

  const navigate = useNavigate()

  const editHostHandler = async () => {
    const formData = new FormData()
    formData.append('address', address)
    formData.append('hostname', hostname)
    formData.append('os', os)
    formData.append('tags', tags.join('\n'))
    formData.append('comment', comment)

    try {
      const resp = await httpClient.post<{ message: string }>(
        urlFor(`/backend/storage/host/edit/${host.id}`),
        formData,
      )

      navigate(-1)

      toast.success(resp.data.message)
    } catch (err) {
      handleHttpClientError(err)
    }
  }
  return (
    <div>
      <Helmet>
        <title>Hosts / Edit - SNER</title>
      </Helmet>
      <Heading headings={['Hosts', 'Edit']} />
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
        <SubmitField name="Edit" handler={editHostHandler} />
      </form>
    </div>
  )
}
export default HostEditPage
