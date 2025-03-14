import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { urlFor } from '@/lib/urlHelper'
import { Column, ColumnButtons, getTableApi, renderElements } from '@/lib/DataTables'
import { httpClient } from '@/lib/httpClient'

import CodeBlock from '@/components/CodeBlock'
import DataTable from '@/components/DataTable'
import Heading from '@/components/Heading'
import { Button } from '@/components/buttons/BasicButtons'
import ButtonGroup from '@/components/buttons/ButtonGroup'
import DeleteButton from '@/components/buttons/DeleteButton'
import { EditButton } from '@/components/buttons/BasicButtons'

const QueueListPage = () => {
  const navigate = useNavigate()

  const columns = [
    Column('id'),
    Column('name'),
    Column('config', {
      createdCell: (cell, data: string) => renderElements(cell, <CodeBlock language="language-yaml" data={data} />),
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
                url={`/scheduler/queue/enqueue/${row['id']}`}
                title="Put targets to queue"
                navigate={navigate}
              >
                Enqueue
              </Button>
              <a
                className="btn btn-outline-secondary"
                title="Flush all targets from queue"
                data-testid="queue-flush"
                href={`/scheduler/queue/flush/${row['id']}`}
                onClick={(e) => {
                  e.preventDefault()
                  httpClient
                    .post(urlFor(`/backend/scheduler/queue/flush/${row['id']}`))
                    .then(() => getTableApi('queue_list_table').draw())
                    .catch(() => toast.error('Error while flusing the queue.'))
                }}
              >
                Flush
              </a>
              <a
                className="btn btn-outline-secondary"
                title="Delete all jobs associated with queue"
                data-testid="queue-prune"
                href={`/scheduler/queue/prune/${row['id']}`}
                onClick={(e) => {
                  e.preventDefault()
                  httpClient
                    .post(urlFor(`/backend/scheduler/queue/prune/${row['id']}`))
                    .then(() => getTableApi('queue_list_table').draw())
                    .catch(() => toast.error('Error while pruning the queue.'))
                }}
              >
                Prune
              </a>
            </ButtonGroup>{' '}
            <ButtonGroup>
              <EditButton url={urlFor(`/scheduler/queue/edit/${row['id']}`)} navigate={navigate} />
              <DeleteButton url={urlFor(`/backend/scheduler/queue/delete/${row['id']}`)} tableId="queue_list_table" />
            </ButtonGroup>
          </>,
        ),
    }),
  ]

  return (
    <div>
      <Helmet>
        <title>Queues / List - SNER</title>
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
        ajax_url={urlFor('/backend/scheduler/queue/list.json')}
      />
    </div>
  )
}
export default QueueListPage
