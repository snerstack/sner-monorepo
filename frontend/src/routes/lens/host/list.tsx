import { Fragment } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Column, renderElements } from '@/lib/DataTables'
import { toQueryString, urlFor } from '@/lib/urlHelper'

import DataTable from '@/components/DataTable'
import Heading from '@/components/Heading'
import Tag from '@/components/Tag'
import DataTableLink from '@/components/DataTableLink'

const LensHostListPage = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    const columns = [
        Column('id', { visible: false }),
        Column('address', {
            createdCell: (cell, data: string, row: HostRow) =>
                renderElements(
                    cell,
                    <DataTableLink url={`/lens/host/view/${row['id']}`} navigate={navigate}>
                        {data}
                    </DataTableLink>
                ),
        }),
        Column('hostname'),
        Column('services'),
        Column('vulns', { title: 'vulnerabilities' }),
        Column('tags', {
            createdCell: (cell, _data: string[], row: HostRow) => {
                renderElements(
                    cell,
                    <div data-testid="host_tags_annotate">
                        {row['tags'].map((tag: string) => (
                            <Fragment key={tag}>
                                <Tag tag={tag} />{' '}
                            </Fragment>
                        ))}
                    </div>,
                )
            },
        }),
    ]

    return (
        <div>
            <Helmet>
                <title>Lens / Host / List - SNER</title>
            </Helmet>

            <Heading headings={['Hosts']} />

            <DataTable
                id="host_list_table"
                columns={columns}
                ajax_url={urlFor(`/backend/lens/host/list.json${toQueryString(searchParams)}`)}
                order={[[2, 'asc']]}
            />
        </div>
    )
}

export default LensHostListPage
