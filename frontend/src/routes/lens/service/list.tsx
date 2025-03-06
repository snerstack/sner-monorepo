import { Fragment } from 'react'
import { Helmet } from 'react-helmet-async'
import { Field } from 'react-querybuilder'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Column, renderElements } from '@/lib/DataTables'
import { toQueryString, urlFor } from '@/lib/urlHelper'

import DataTable from '@/components/DataTable'
import DataTableLink from '@/components/DataTableLink'
import Heading from '@/components/Heading'
import RBQFilter from '@/components/RBQFilter'
import ServiceEndpointDropdown from '@/components/ServiceEndpointDropdown'
import Tag from '@/components/Tag'

const LensServiceListPage = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    const dtColumns = [
        Column('id', { visible: false }),
        Column('host_id', { visible: false }),
        Column('host_address', {
            title: "Address",
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
        Column('host_hostname', { title: "Hostname" }),
        Column('proto', { title: "Proto" }),
        Column('port', {
            title: "Port",
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
        Column('name', { title: "Name" }),
        Column('state', { title: "State" }),
        Column('info', { title: "Info" }),
        Column('tags', {
            title: "Tags",
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

    const rbqFields: Field[] = [
        { name: "Host.address", label: "Address" },
        { name: "Host.hostname", label: "Hostname" },
        { name: "Service.proto", label: "Proto" },
        { name: "Service.port", label: "Port" },
        { name: "Service.name", label: "Name" },
        { name: "Service.state", label: "State" },
        { name: "Service.info", label: "Info" },
        { name: "Service.tags", label: "Tags[]" },
    ]

    return (
        <div>
            <Helmet>
                <title>Lens / Service / List - SNER</title>
            </Helmet>

            <Heading headings={['Services']} />

            <RBQFilter fields={rbqFields} />

            <DataTable
                id="service_list_table"
                columns={dtColumns}
                ajax_url={urlFor(`/backend/lens/service/list.json${toQueryString(searchParams)}`)}
                order={[[2, 'asc']]}
            />
        </div>
    )
}

export default LensServiceListPage
