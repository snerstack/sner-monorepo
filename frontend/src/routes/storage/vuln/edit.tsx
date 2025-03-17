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
import HostAutocompleteField from '@/components/fields/HostAutocompleteField'
import RadioField from '@/components/fields/RadioField'
import ServiceAutocompleteField from '@/components/fields/ServiceAutocompleteField'
import SubmitField from '@/components/fields/SubmitField'
import TagsField from '@/components/fields/TagsField'
import TextAreaField from '@/components/fields/TextAreaField'
import TextField from '@/components/fields/TextField'

const VulnEditPage = () => {
  const [appConfig, ] = useRecoilState(appConfigState)
  const vuln = useLoaderData() as Vuln

  const [hostId, setHostId] = useState<number>(vuln.host_id)
  const [serviceId, setServiceId] = useState<number>(vuln.service_id || 0)
  const [viaTarget, setViaTarget] = useState<string>(vuln.via_target || '')
  const [name, setName] = useState<string>(vuln.name)
  const [xtype, setXtype] = useState<string>(vuln.xtype || '')
  const [severity, setSeverity] = useState<{ options: string[]; selected: string }>({
    options: ['unknown', 'info', 'low', 'medium', 'high', 'critical'],
    selected: vuln.severity,
  })
  const [descr, setDescr] = useState<string>(vuln.descr || '')
  const [data, setData] = useState<string>(vuln.data || '')
  const [refs, setRefs] = useState<string>(vuln.refs.join('\n') || '')
  const [tags, setTags] = useState<string[]>(vuln.tags)
  const [comment, setComment] = useState<string>(vuln.comment || '')

  const navigate = useNavigate()

  const editVulnHandler = async () => {
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
      const resp = await httpClient.post<{ message: string }>(
        urlFor(`/backend/storage/vuln/edit/${vuln.id}`),
        formData,
      )

      navigate(`/storage/vuln/view/${vuln.id}`)

      toast.success(resp.data.message)
    } catch (err) {
      handleHttpClientError(err)
    }
  }
  return (
    <div>
      <Helmet>
        <title>Vulns / Edit - SNER</title>
      </Helmet>
      <Heading headings={['Vulns', 'Edit']} />
      <form id="vuln_form" method="post">
        <div className="form-group row">
          <label className="col-sm-2 col-form-label">
            <a data-toggle="collapse" href="#refs_collapse">
              Host, Service
            </a>
          </label>
          <div className="col-sm-10">
            <div className="form-control-plaintext">
              {vuln.address} {vuln.hostname && `(${vuln.hostname})`}{' '}
              {vuln.service_port > 0 && `${vuln.service_port}/${vuln.service_proto}`}
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
        <SubmitField name="Edit" handler={editVulnHandler} />
      </form>
    </div>
  )
}
export default VulnEditPage
