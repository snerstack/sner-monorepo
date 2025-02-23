import { Fragment } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Column, renderElements } from '@/lib/DataTables'
import { toQueryString, urlFor } from '@/lib/urlHelper'

import DataTable from '@/components/DataTable'
import DataTableLink from '@/components/DataTableLink'
import Heading from '@/components/Heading'
import ServiceEndpointDropdown from '@/components/ServiceEndpointDropdown'
import Tag from '@/components/Tag'

const LensServiceListPage = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    const columns = [
        Column('id', { visible: false }),
        Column('host_id', { visible: false }),
        Column('host_address', {
            createdCell: (cell, data: string, row: ServiceRow) =>
                renderElements(
                    cell,
                    <DataTableLink
                        url={`/lens/host/view/${row['host_id']}`}
                        navigate={navigate}
                    >
                        {data}
                    </DataTableLink>
                ),
        }),
        Column('host_hostname'),
        Column('proto'),
        Column('port', {
            className: 'service_endpoint_dropdown',
            createdCell: (cell, _data: string, row: ServiceRow) =>
                renderElements(
                    cell,
                    <ServiceEndpointDropdown
                        service={row['port'].toString()}
                        address={row['host_address']}
                        hostname={row['host_hostname']}
                        proto={row['proto']}
                        port={row['port']}
                    />,
                ),
        }),
        Column('name'),
        Column('state'),
        Column('info'),
        Column('tags', {
            createdCell: (cell, _data: string[], row: ServiceRow) => {
                renderElements(
                    cell,
                    <div data-testid="service_tags_annotate">
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
                <title>Lens / Service / List - SNER</title>
            </Helmet>

            <Heading headings={['Services']} />

            <DataTable
                id="service_list_table"
                columns={columns}
                ajax_url={urlFor(`/backend/lens/service/list.json${toQueryString(searchParams)}`)}
                order={[[2, 'asc']]}
            />
        </div>
    )
}

export default LensServiceListPage
