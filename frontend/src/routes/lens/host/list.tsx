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
import Tag from '@/components/Tag'

const LensHostListPage = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    const dtColumns = [
        Column('id', { visible: false }),
        Column('address', {
            title: "Address",
            createdCell: (cell, data: string, row: HostRow) =>
                renderElements(
                    cell,
                    <DataTableLink url={`/lens/host/view/${row['id']}`} navigate={navigate}>
                        {data}
                    </DataTableLink>
                ),
        }),
        Column('hostname', { title: "Hostname" }),
        Column('services', { title: "Services" }),
        Column('vulns', { title: 'Vulnerabilities' }),
        Column('Tags', {
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

    const rbqFields: Field[] = [
        { name: "Host.address", label: "Address" },
        { name: "Host.hostname", label: "Hostname" },
        { name: "Host.tags", label: "Tags[]" },
    ]

    return (
        <div>
            <Helmet>
                <title>Lens / Host / List - SNER</title>
            </Helmet>

            <Heading headings={['Hosts']} />

            <RBQFilter fields={rbqFields} />

            <DataTable
                id="host_list_table"
                columns={dtColumns}
                ajax_url={urlFor(`/backend/lens/host/list.json${toQueryString(searchParams)}`)}
                order={[[2, 'asc']]}
            />
        </div>
    )
}

export default LensHostListPage
