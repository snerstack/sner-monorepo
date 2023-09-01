import { unique } from '@/utils'
import env from 'app-env'
import { useState } from 'react'
import { useLoaderData, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { Column, ColumnSelect, getTableApi } from '@/lib/DataTables'
import httpClient from '@/lib/httpClient'

import DataTable from '@/components/DataTable'
import RadioField from '@/components/Fields/RadioField'
import SubmitField from '@/components/Fields/SubmitField'
import TagsField from '@/components/Fields/TagsField'
import TextAreaField from '@/components/Fields/TextAreaField'
import TextField from '@/components/Fields/TextField'
import Heading from '@/components/Heading'

const VulnMulticopyPage = () => {
  const vuln = useLoaderData() as Vuln
  const navigate = useNavigate()

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
        env.VITE_SERVER_URL + `/storage/vuln/multicopy/${vuln.id}`,
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
      <Heading headings={['Vulns', 'Multicopy']} />

      <DataTable
        id="vuln_multicopy_endpoints_table"
        columns={columns}
        ajax={{
          url: env.VITE_SERVER_URL + '/storage/vuln/multicopy_endpoints.json',
          type: 'POST',
          xhrFields: { withCredentials: true },
        }}
        select={{ style: 'multi', selector: 'tr' }}
        lengthMenu={[10, 50, 100, 200]}
        drawCallback={() => {
          const checkboxes = document.querySelectorAll('.select-checkbox')
          checkboxes.forEach((checkbox) =>
            checkbox.addEventListener('click', () => {
              setTimeout(() => {
                const dt = getTableApi('vuln_multicopy_endpoints_table')
                const endpoints = dt!
                  .rows({ selected: true })
                  .data()
                  .toArray()
                  .map((row: VulnMulticopyRow) => row['endpoint_id'])

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
          defaultTags={unique([...env.VITE_HOST_TAGS, ...env.VITE_VULN_TAGS, ...env.VITE_ANNOTATE_TAGS]).sort()}
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
