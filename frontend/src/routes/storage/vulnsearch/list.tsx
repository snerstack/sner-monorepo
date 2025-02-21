import clsx from 'clsx'
import { Fragment, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useRecoilState } from 'recoil'

import { appConfigState } from '@/atoms/appConfigAtom'
import { Column, ColumnButtons, ColumnSelect, getTableApi, renderElements } from '@/lib/DataTables'
import { DEFAULT_ANNOTATE_STATE, DEFAULT_MULTIPLE_TAG_STATE, toolboxesVisible, viaTargetVisible } from '@/lib/sner/storage'
import { toQueryString, urlFor } from '@/lib/urlHelper'

import DataTable from '@/components/DataTable'
import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'
import ServiceEndpointDropdown from '@/components/ServiceEndpointDropdown'
import Tag from '@/components/Tag'
import ButtonGroup from '@/components/buttons/ButtonGroup'
import TagButton from '@/components/buttons/TagButton'
import TagsDropdownButton from '@/components/buttons/TagsDropdownButton'
import { ViewButton } from '@/components/buttons/BasicButtons'
import AnnotateModal from '@/components/modals/AnnotateModal'
import MultipleTagModal from '@/components/modals/MultipleTagModal'

const VulnSearchListPage = () => {
  const [appConfig, ] = useRecoilState(appConfigState)

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [annotate, setAnnotate] = useState<Annotate>(DEFAULT_ANNOTATE_STATE)
  const [multipleTag, setMultipleTag] = useState<MultipleTag>(DEFAULT_MULTIPLE_TAG_STATE)

  const columns = [
    ColumnSelect({ visible: toolboxesVisible() }),
    Column('id', { visible: false }),
    Column('host_address', {
      createdCell: (cell, data: string, row: VulnSearchRow) =>
        renderElements(
          cell,
          <a
            onClick={(e) => {
              e.preventDefault()
              navigate(`/storage/host/view/${row['host_id']}`)
            }}
            href={`/storage/host/view/${row['host_id']}`}
          >
            {data}
          </a>,
        ),
    }),
    Column('host_hostname'),
    Column('service_proto', { visible: false }),
    Column('service_port', { visible: false }),
    Column('service', {
      className: 'service_endpoint_dropdown',
      createdCell: (cell, _data: string, row: VulnSearchRow) =>
        renderElements(
          cell,
          <ServiceEndpointDropdown
            service={row['service']}
            address={row['host_address']}
            hostname={row['host_hostname']}
            proto={row['service_proto']}
            port={row['service_port']}
          />,
        ),
    }),
    Column('via_target', {
      visible: viaTargetVisible(),
    }),
    Column('cveid', {
      createdCell: (cell, data: string) => {
        renderElements(cell, <a href={`https://cve.circl.lu/cve/${data}`}>{data}</a>)
      },
    }),
    Column('cvss'),
    Column('cvss3'),
    Column('attack_vector'),
    Column('cpe_full'),
    Column('name'),
    Column('tags', {
      className: 'abutton_annotate_dt',
      createdCell: (cell, _data: string[], row: VulnSearchRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotate({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'vulnsearch_list_table',
            url: urlFor(`/backend/storage/vulnsearch/annotate/${row['id']}`),
          })
        }
        renderElements(
          cell,
          <div data-testid="vulnsearch_tags_annotate">
            {row['tags'].map((tag: string) => (
              <Fragment key={tag}>
                <Tag tag={tag} />{' '}
              </Fragment>
            ))}
          </div>,
        )
      },
    }),
    Column('comment', {
      className: 'abutton_annotate_dt forcewrap',
      title: 'cmnt',
      createdCell: (cell, _data: string, row: VulnSearchRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotate({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'vulnsearch_list_table',
            url: urlFor(`/backend/storage/vulnsearch/annotate/${row['id']}`),
          })
        }
        renderElements(cell, <div data-testid="vulnsearch_comment_annotate">{row['comment']}</div>)
      },
    }),
    ColumnButtons({
      createdCell: (cell, _data: string, row: VulnSearchRow) =>
        renderElements(
          cell,
          <ButtonGroup>
            <ViewButton url={`/storage/vulnsearch/view/${row['id']}`} navigate={navigate} />
          </ButtonGroup>,
        ),
    }),
  ]

  return (
    <div>
      <Helmet>
        <title>Vulnsearch / List - SNER</title>
      </Helmet>

      <Heading headings={['Vulnsearch (pre-computed)']}>
        <div className="breadcrumb-buttons pl-2">
          <div className='btn-group'>
            <Link
              className="btn btn-outline-secondary"
              to='/storage/vulnsearch/list?filter=Vulnsearch.attack_vector ilike "%NETWORK%"'
              title="Remotely exploitable"
            >
              Remote
            </Link>
            <Link
              className="btn btn-outline-secondary"
              to='/storage/vulnsearch/list?filter=Vulnsearch.data astext_ilike "%exploit-db%"'
            >
              With exploit
            </Link>
            <Link
              className="btn btn-outline-secondary"
              to='/storage/vulnsearch/list?filter=Vulnsearch.attack_vector ilike "%NETWORK%" AND Vulnsearch.cvss > "7" AND Vulnsearch.data astext_ilike "%exploit-db%" AND Vulnsearch.tags not_any "reviewed"'
            >
              Farmer
            </Link>

            <a className="btn btn-outline-secondary" data-toggle="collapse" data-target="#filter_form">
              <i className="fas fa-filter"></i>
            </a>
          </div>
        </div>
      </Heading>

      <div id="vulnsearch_list_table_toolbar" className="dt_toolbar">
        <div data-testid="vulnsearch_list_table_toolbox" className={clsx('dt_toolbar_toolbox', !toolboxesVisible() && 'collapse')}
        >
          <div className="btn-group">
            <a className="btn btn-outline-secondary">
              <i className="fas fa-check-square"></i>
            </a>
            <a
              className="btn btn-outline-secondary"
              data-testid="vulnsearch_select_all"
              href="#"
              title="select all"
              onClick={() => {
                const dt = getTableApi('vulnsearch_list_table')
                dt.rows({ page: 'current' }).select()
              }}
            >
              All
            </a>
            <a
              className="btn btn-outline-secondary"
              data-testid="vulnsearch_unselect_all"
              href="#"
              title="unselect all"
              onClick={() => {
                const dt = getTableApi('vulnsearch_list_table')
                dt.rows({ page: 'current' }).deselect()
              }}
            >
              None
            </a>
          </div>{' '}
          <div className="btn-group">
            <a
              className="btn btn-outline-secondary abutton_freetag_set_multiid"
              href="#"
              data-testid="vulnsearch_set_multiple_tag"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'set',
                  tableId: 'vulnsearch_list_table',
                  url: urlFor('/backend/storage/vulnsearch/tag_multiid'),
                })
              }
            >
              <i className="fas fa-tag"></i>
            </a>
            {appConfig.tags.vulnsearch.map((tag) => (
              <TagButton tag={tag} key={tag} url={urlFor("/backend/storage/vulnsearch/tag_multiid")} tableId="vulnsearch_list_table" />
            ))}
          </div>{' '}
          <div className="btn-group">
            <a
              className="btn btn-outline-secondary abutton_freetag_unset_multiid"
              href="#"
              data-testid="vulnsearch_unset_multiple_tag"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'unset',
                  tableId: 'vulnsearch_list_table',
                  url: urlFor('/backend/storage/vulnsearch/tag_multiid'),
                })
              }
            >
              <i className="fas fa-eraser"></i>
            </a>
            <div className="btn-group">
              <a
                className="btn btn-outline-secondary dropdown-toggle"
                data-toggle="dropdown"
                href="#"
                title="remove tag dropdown"
              >
                <i className="fas fa-remove-format"></i>
              </a>
              <TagsDropdownButton
                tags={appConfig.tags.vulnsearch}
                url={urlFor("/backend/storage/vulnsearch/tag_multiid")}
                tableId="vulnsearch_list_table"
              />
            </div>
          </div>{' '}
          <div className="btn-group">
            <a className="btn btn-outline-secondary disabled">
              <i className="fas fa-filter"></i>
            </a>
            <Link
              className="btn btn-outline-secondary"
              to='/storage/vulnsearch/list?filter=Vulnsearch.data astext_ilike "%exploit-db%"'
            >
              has_exploit
            </Link>
          </div>
        </div>

        <FilterForm url="/storage/vulnsearch/list" />
      </div>

      <DataTable
        id="vulnsearch_list_table"
        columns={columns}
        ajax_url={urlFor(`/backend/storage/vulnsearch/list.json${toQueryString(searchParams)}`)}
        select={toolboxesVisible() ? { style: 'multi', selector: 'td:first-child' } : false}
      />

      <AnnotateModal annotate={annotate} setAnnotate={setAnnotate} />
      <MultipleTagModal multipleTag={multipleTag} setMultipleTag={setMultipleTag} />
    </div>
  )
}
export default VulnSearchListPage
