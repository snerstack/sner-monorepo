import Button from '@/components/Buttons/Button'
import ButtonGroup from '@/components/Buttons/ButtonGroup'
import DeleteButton from '@/components/Buttons/DeleteButton'
import DataTable from '@/components/DataTable'
import Heading from '@/components/Heading'
import { Column, ColumnButtons } from '@/lib/DataTables'
import { renderToString } from 'react-dom/server'

const JobListPage = () => {
  const columns = [
    Column('id'),
    Column('queue_name'),
    Column('assignment', {
      render: (data, type, row, meta) => {
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
      render: (data, type, row, meta) =>
        renderToString(
          ButtonGroup({
            children: [
              Button({ name: 'Repeat', title: 'Repeat job', url: `/scheduler/job/repeat/${row['id']}` }),
              Button({
                name: 'Reconcile',
                title: 'Forcefail job and reclaim heatmap count',
                url: `/scheduler/job/reconcile/${row['id']}`,
              }),
              DeleteButton({ url: `/scheduler/job/delete/${row['id']}` }),
            ],
          }),
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
            <a className="btn btn-outline-secondary" href='/scheduler/job/list?filter=Job.retval+is_null+""'>
              Running
            </a>
          </div>
        </div>
        {/* {{ cm.filter_form() }} */}
      </div>
      <DataTable
        columns={columns}
        ajax={{ url: 'http://localhost:18000/scheduler/job/list.json', type: 'POST' }}
        drawCallback={(settings) => {}}
      />
    </div>
  )
}
export default JobListPage
