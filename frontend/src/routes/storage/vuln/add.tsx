import { unique } from '@/utils'
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

import Heading from '@/components/Heading'
import HostAutocompleteField from '@/components/fields/HostAutocompleteField'
import RadioField from '@/components/fields/RadioField'
import ServiceAutocompleteField from '@/components/fields/ServiceAutocompleteField'
import SubmitField from '@/components/fields/SubmitField'
import TagsField from '@/components/fields/TagsField'
import TextAreaField from '@/components/fields/TextAreaField'
import TextField from '@/components/fields/TextField'

const VulnAddPage = ({ type }: { type: 'host' | 'service' }) => {
  const loaderData = useLoaderData() as Host & Service

  const [address, setAddress] = useState<string>('')
  const [hostname, setHostname] = useState<string>('')
  const [hostId, setHostId] = useState<number>(0)
  const [port, setPort] = useState<number>(0)
  const [proto, setProto] = useState<string>('')
  const [serviceId, setServiceId] = useState<number>(0)
  const [viaTarget, setViaTarget] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [xtype, setXtype] = useState<string>('')
  const [severity, setSeverity] = useState<{ options: string[]; selected: string }>({
    options: ['unknown', 'info', 'low', 'medium', 'high', 'critical'],
    selected: '',
  })
  const [descr, setDescr] = useState<string>('')
  const [data, setData] = useState<string>('')
  const [refs, setRefs] = useState<string>('')
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

  const addVulnHandler = async () => {
    const formData = new FormData()
    formData.append('host_id', hostId.toString())
    formData.append('service_id', serviceId === 0 ? '' : serviceId.toString())
    formData.append('via_target', viaTarget)
    formData.append('name', name)
    formData.append('xtype', xtype)
    formData.append('severity', severity.selected)
    formData.append('descr', descr)
    formData.append('data', data)
    formData.append('refs', refs)
    formData.append('tags', tags.join('\n'))
    formData.append('comment', comment)

    try {
      const resp = await httpClient.post<{ vuln_id: number }>(
        urlFor(`/backend/storage/vuln/add/${type}/${hostId}`),
        formData,
      )

      navigate(`/storage/vuln/view/${resp.data.vuln_id}`)

      toast.success('Vuln has been successfully added.')
    } catch (err) {
      toast.error('Error while adding a vuln.')
    }
  }
  return (
    <div>
      <Helmet>
        <title>Vulns / Add - sner4</title>
      </Helmet>
      <Heading headings={['Vulns', 'Add']} />
      <form id="service_form" method="post">
        <div className="form-group row">
          <label className="col-sm-2 col-form-label">
            <a data-toggle="collapse" href="#refs_collapse">
              Host, Service
            </a>
          </label>
          <div className="col-sm-10">
            <div className="form-control-plaintext">
              {address} {hostname && `(${hostname})`} {port && `${port}/${proto}`}
            </div>
          </div>
        </div>
        <div id="refs_collapse" className="collapse">
          <HostAutocompleteField
            name="host_id"
            label="Host ID"
            placeholder="Host ID"
            required={true}
            _state={hostId}
            _setState={setHostId}
          />
          <ServiceAutocompleteField
            hostId={hostId}
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
        <TextField name="name" label="Name" placeholder="Name" required={true} _state={name} _setState={setName} />
        <TextField name="xtype" label="xType" placeholder="xType" _state={xtype} _setState={setXtype} />
        <RadioField name="severity" label="Severity" required={true} _state={severity} _setState={setSeverity} />
        <TextAreaField name="descr" label="Descr" placeholder="Descr" rows={15} _state={descr} _setState={setDescr} />
        <TextAreaField name="data" label="Data" placeholder="Data" rows={10} _state={data} _setState={setData} />
        <TextAreaField name="refs" label="Refs" placeholder="Refs" rows={3} _state={refs} _setState={setRefs} />
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
        <SubmitField name="Add" handler={addVulnHandler} />
      </form>
    </div>
  )
}
export default VulnAddPage
