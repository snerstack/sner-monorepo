import env from 'app-env'
import { Link, useNavigate } from 'react-router-dom'
import { useCookie } from 'react-use'

import { Column, ColumnButtons, renderElements } from '@/lib/DataTables'

import Button from '@/components/Buttons/Button'
import ButtonGroup from '@/components/Buttons/ButtonGroup'
import DeleteButton from '@/components/Buttons/DeleteButton'
import DataTable from '@/components/DataTable'
import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'

const JobListPage = () => {
  const navigate = useNavigate()
  const [csrfToken] = useCookie('XSRF-TOKEN')

  const columns = [
    Column('id'),
    Column('queue_name'),
    Column('assignment', {
      render: (data: string) => {
        if (!data) return

        if (data.length >= 100) {
          return data.substring(0, 99) + '...'
        }

        return data
      },
    }),
    Column('retval'),
    Column('time_start'),
    Column('time_end'),
    Column('time_taken'),
    ColumnButtons({
      createdCell: (cell, _data: string, row: JobRow) =>
        renderElements(
          cell,
          <ButtonGroup>
            <Button name="Repeat" title="Repeat job" url={`/scheduler/job/repeat/${row['id']}`} navigate={navigate} />
            <Button
              name="Reconcile"
              title="Forcefail job and reclaim heatmap count"
              url={`/scheduler/job/reconcile/${row['id']}`}
              navigate={navigate}
            />
            <DeleteButton url={`/scheduler/job/reconcile/${row['id']}`} />
          </ButtonGroup>,
        ),
    }),
  ]

  return (
    <div>
      <Heading headings={['Jobs']} />
      <div id="job_list_table_toolbar" className="dt_toolbar">
        <div id="job_list_table_toolbox" className="dt_toolbar_toolbox_alwaysvisible">
          <div className="btn-group">
            <a className="btn btn-outline-secondary disabled">
              <i className="fas fa-filter"></i>
            </a>
            <Link className="btn btn-outline-secondary" to='/scheduler/job/list?filter=Job.retval+is_null+""'>
              Running
            </Link>
          </div>
        </div>
        <FilterForm url="/scheduler/job/list" />
      </div>
      <DataTable
        id="job_list_table"
        columns={columns}
        ajax={{
          url: env.VITE_SERVER_URL + '/scheduler/job/list.json',
          type: 'POST',
          xhrFields: { withCredentials: true },
          beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
        }}
      />
    </div>
  )
}
export default JobListPage
