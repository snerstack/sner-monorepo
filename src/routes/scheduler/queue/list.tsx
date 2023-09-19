import env from 'app-env'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useCookie } from 'react-use'

import { Column, ColumnButtons, renderElements } from '@/lib/DataTables'
import httpClient from '@/lib/httpClient'

import Button from '@/components/Buttons/Button'
import ButtonGroup from '@/components/Buttons/ButtonGroup'
import DeleteButton from '@/components/Buttons/DeleteButton'
import EditButton from '@/components/Buttons/EditButton'
import DataTable from '@/components/DataTable'
import Heading from '@/components/Heading'

const QueueListPage = () => {
  const navigate = useNavigate()
  const [csrfToken] = useCookie('XSRF-TOKEN')

  const columns = [
    Column('id'),
    Column('name'),
    Column('config', {
      createdCell: (cell, data: string) =>
        renderElements(
          cell,
          <pre>
            <code>{data}</code>
          </pre>,
        ),
    }),
    Column('group_size'),
    Column('priority'),
    Column('active'),
    Column('reqs'),
    Column('nr_targets'),
    Column('nr_jobs'),
    ColumnButtons({
      createdCell: (cell, _data: string, row: QueryRow) =>
        renderElements(
          cell,
          <>
            <ButtonGroup>
              <Button
                name="Enqueue"
                title="Put targets to queue"
                url={`/scheduler/queue/enqueue/${row['id']}`}
                navigate={navigate}
              />
              <a
                className="btn btn-outline-secondary"
                title="Flush all targets from queue"
                href={`/scheduler/queue/flush/${row['id']}`}
                onClick={(e) => {
                  e.preventDefault()
                  httpClient
                    .post(env.VITE_SERVER_URL + `/scheduler/queue/flush/${row['id']}`)
                    .then(() => window.location.reload())
                    .catch(() => toast.error('Error while flusing the queue.'))
                }}
              >
                Flush
              </a>
              <a
                className="btn btn-outline-secondary"
                title="Delete all jobs associated with queue"
                href={`/scheduler/queue/prune/${row['id']}`}
                onClick={(e) => {
                  e.preventDefault()
                  httpClient
                    .post(env.VITE_SERVER_URL + `/scheduler/queue/prune/${row['id']}`)
                    .then(() => window.location.reload())
                    .catch(() => toast.error('Error while pruning the queue.'))
                }}
              >
                Prune
              </a>
            </ButtonGroup>{' '}
            <ButtonGroup>
              <EditButton url={`/scheduler/queue/edit/${row['id']}`} navigate={navigate} />
              <DeleteButton url={`/scheduler/queue/delete/${row['id']}`} />
            </ButtonGroup>
          </>,
        ),
    }),
  ]

  return (
    <div>
      <Helmet>
        <title>Queues / List - sner4</title>
      </Helmet>

      <Heading headings={['Queues']}>
        <div className="breadcrumb-buttons pl-2">
          <Link className="btn btn-outline-primary" to="/scheduler/queue/add">
            Add
          </Link>
        </div>
      </Heading>

      <DataTable
        id="queue_list_table"
        columns={columns}
        ajax={{
          url: env.VITE_SERVER_URL + '/scheduler/queue/list.json',
          type: 'POST',
          xhrFields: { withCredentials: true },
          beforeSend: (req) => req.setRequestHeader('X-CSRF-TOKEN', csrfToken!),
        }}
      />
    </div>
  )
}
export default QueueListPage
