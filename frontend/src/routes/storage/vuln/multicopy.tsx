import { unique } from '@/utils'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useCookie } from 'react-use'

import { Column, ColumnSelect, getTableApi } from '@/lib/DataTables'
import httpClient from '@/lib/httpClient'

import DataTable from '@/components/DataTable'
import Heading from '@/components/Heading'
import RadioField from '@/components/fields/RadioField'
import SubmitField from '@/components/fields/SubmitField'
import TagsField from '@/components/fields/TagsField'
import TextAreaField from '@/components/fields/TextAreaField'
import TextField from '@/components/fields/TextField'

const VulnMulticopyPage = () => {
  const vuln = useLoaderData() as Vuln
  const navigate = useNavigate()
  const [csrfToken] = useCookie('XSRF-TOKEN')

  const [endpoints, setEndpoints] = useState<string>('')
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

  const multicopyHandler = async () => {
    const formData = new FormData()
    formData.append('endpoints', endpoints)
    formData.append('name', name)
    formData.append('xtype', xtype)
    formData.append('severity', severity.selected)
    formData.append('descr', descr)
    formData.append('data', data)
    formData.append('refs', refs)
    formData.append('tags', tags.join('\n'))
    formData.append('comment', comment)

    try {
      const resp = await httpClient.post<{ new_vulns: string }>(
        import.meta.env.VITE_SERVER_URL + `/storage/vuln/multicopy/${vuln.id}.json`,
        formData,
      )

      navigate(`/storage/vuln/list?filter=Vuln.id in ${resp.data.new_vulns}`)
    } catch (err) {
      toast.error('Error while multicopying vulns.')
    }
  }

  const columns = [
    ColumnSelect(),
    Column('endpoint_id', { visible: false }),
    Column('host_address'),
    Column('host_hostname'),
    Column('service_proto'),
    Column('service_port'),
    Column('service_info'),
  ]

  return (
    <div>
      <Helmet>
        <title>Vulns / Multicopy - sner4</title>
      </Helmet>
      <Heading headings={['Vulns', 'Multicopy']} />

      <DataTable
        id="vuln_multicopy_endpoints_table"
        columns={columns}
        ajax={{
          url: import.meta.env.VITE_SERVER_URL + '/storage/vuln/multicopy_endpoints.json',
          type: 'POST',
          xhrFields: { withCredentials: true },
          beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
        }}
        select={{ style: 'multi', selector: 'tr' }}
        lengthMenu={[10, 50, 100, 200]}
        drawCallback={() => {
          const rows = document.querySelectorAll('#vuln_multicopy_endpoints_table tbody tr')
          rows.forEach((row) =>
            row.addEventListener('click', () => {
              setTimeout(() => {
                const dt = getTableApi('vuln_multicopy_endpoints_table')
                const endpoints = dt
                  .rows({ selected: true })
                  .data()
                  .toArray()
                  .map((r: VulnMulticopyRow) => r['endpoint_id'])

                setEndpoints(endpoints.length === 0 ? '' : JSON.stringify(endpoints))
              }, 25)
            }),
          )
        }}
      />

      <form id="vuln_form" method="post">
        <TextField
          name="endpoints"
          label="Endpoints"
          placeholder="Endpoints"
          _state={endpoints}
          _setState={setEndpoints}
        />
        <TextField name="name" label="Name" placeholder="Names" _state={name} _setState={setName} />
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
        <SubmitField name="Save" handler={multicopyHandler} />
      </form>
    </div>
  )
}
export default VulnMulticopyPage
