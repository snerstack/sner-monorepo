import Button from '@/components/Buttons/Button'
import ButtonGroup from '@/components/Buttons/ButtonGroup'
import DeleteButton from '@/components/Buttons/DeleteButton'
import EditButton from '@/components/Buttons/EditButton'
import DataTable from '@/components/DataTable'
import Heading from '@/components/Heading'
import { Column, ColumnButtons } from '@/lib/DataTables'
import { renderToString } from 'react-dom/server'

const QueueListPage = () => {
  const columns = [
    Column('id'),
    Column('name'),
    Column('config', {
      render: (data, type, row, meta) => {
        return `<pre><code>${data}</code></pre>`
      },
    }),
    Column('group_size'),
    Column('priority'),
    Column('active'),
    Column('reqs'),
    Column('nr_targets'),
    Column('nr_jobs'),
    ColumnButtons({
      render: (data, type, row, meta) => {
        const queue_btns = renderToString(
          ButtonGroup({
            children: [
              Button({ name: 'Enqueue', title: 'Put targets to queue', url: `/scheduler/queue/enqueue/${row['id']}` }),
              Button({
                name: 'Flush',
                title: 'Flush all targets from queue',
                url: `/scheduler/queue/flush/${row['id']}`,
              }),
              Button({
                name: 'Prune',
                title: 'Delete all jobs associated with queue',
                url: `/scheduler/queue/prune/${row['id']}`,
              }),
            ],
          }),
        )

        const edit_btns = renderToString(
          ButtonGroup({
            children: [
              EditButton({ url: `/scheduler/queue/edit/${row['id']}` }),
              DeleteButton({ url: `/scheduler/queue/delete/${row['id']}` }),
            ],
          }),
        )

        return queue_btns + ' ' + edit_btns
      },
    }),
  ]

  return (
    <div>
      <Heading headings={['Queues']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-primary" href="/scheduler/queue/add">
            Add
          </a>
        </div>
      </Heading>

      <DataTable
        columns={columns}
        ajax={{ url: 'http://localhost:18000/scheduler/queue/list.json', type: 'POST' }}
        drawCallback={(settings) => {}}
      />
    </div>
  )
}
export default QueueListPage
