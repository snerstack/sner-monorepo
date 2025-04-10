import clsx from 'clsx'
import { Fragment, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useRecoilState } from 'recoil'

import { appConfigState } from '@/atoms/appConfigAtom'
import { Column, ColumnSelect, getTableApi, renderElements } from '@/lib/DataTables'
import { DEFAULT_ANNOTATE_STATE, DEFAULT_MULTIPLE_TAG_STATE, toolboxesVisible, viaTargetVisible } from '@/lib/sner/storage'
import { toQueryString, urlFor } from '@/lib/urlHelper'

import DataTable from '@/components/DataTable'
import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'
import ServiceEndpointDropdown from '@/components/ServiceEndpointDropdown'
import Tag from '@/components/Tag'
import TagButton from '@/components/buttons/TagButton'
import TagsDropdownButton from '@/components/buttons/TagsDropdownButton'
import SubmitField from '@/components/fields/SubmitField'
import TextField from '@/components/fields/TextField'
import AnnotateModal from '@/components/modals/AnnotateModal'
import MultipleTagModal from '@/components/modals/MultipleTagModal'

const VersionInfosListPage = () => {
  const [appConfig, ] = useRecoilState(appConfigState)

  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [annotate, setAnnotate] = useState<Annotate>(DEFAULT_ANNOTATE_STATE)
  const [multipleTag, setMultipleTag] = useState<MultipleTag>(DEFAULT_MULTIPLE_TAG_STATE)

  const [product, setProduct] = useState<string>(searchParams.get('product') || '')
  const [versionspec, setVersionspec] = useState<string>(searchParams.get('versionspec') || '')

  const queryHandler = () => {
    setSearchParams((params) => {
      params.set('product', product)
      params.set('versionspec', versionspec)
      return params
    })

    const dt = getTableApi('versioninfo_list_table')
    dt.ajax.reload()
  }

  const columns = [
    ColumnSelect({ visible: toolboxesVisible() }),
    Column('id', { visible: false }),
    Column('host_id', { visible: false }),
    Column('host_address', {
      createdCell: (cell, _data: string, row: VersionInfoRow) =>
        renderElements(
          cell,
          <a
            href={`/storage/host/view/${row['host_id']}`}
            onClick={(e) => {
              e.preventDefault()
              navigate(`/storage/host/view/${row['host_id']}`)
            }}
          >
            {row['host_address']}
          </a>,
        ),
    }),
    Column('host_hostname'),
    Column('service_proto', { visible: false }),
    Column('service_port', { visible: false }),
    Column('service', {
      className: 'service_endpoint_dropdown',
      createdCell: (cell, _data: string, row: VersionInfoRow) =>
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
    Column('via_target', { visible: viaTargetVisible() }),
    Column('product'),
    Column('version'),
    Column('extra'),
    Column('tags', {
      className: 'abutton_annotate_dt',
      createdCell: (cell, _data: string[], row: VersionInfoRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotate({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'versioninfo_list_table',
            url: urlFor(`/backend/storage/versioninfo/annotate/${row['id']}`),
          })
        }
        renderElements(
          cell,
          <div data-testid="versioninfo_tags_annotate">
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
      createdCell: (cell, _data: string, row: VersionInfoRow) => {
        const element = cell as HTMLTableCellElement
        element.ondblclick = () => {
          setAnnotate({
            show: true,
            tags: row['tags'],
            comment: row['comment'] || '',
            tableId: 'versioninfo_list_table',
            url: urlFor(`/backend/storage/versioninfo/annotate/${row['id']}`),
          })
        }
        renderElements(cell, <div data-testid="versioninfo_comment_annotate">{row['comment']}</div>)
      },
    }),
  ]
  return (
    <div>
      <Helmet>
        <title>Versioninfos / List - SNER</title>
      </Helmet>

      <Heading headings={['Versioninfo (pre-computed)']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-secondary" data-toggle="collapse" data-target="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div className="container-fluid">
        <form id="versioninfo_query_form">
          <div className="row">
            <div className="col">
              <TextField
                name="product"
                label="Product"
                description="SQL ilike query token"
                placeholder="Product"
                _state={product}
                _setState={setProduct}
              />
            </div>
            <div className="col">
              <TextField
                name="versionspec"
                label="Versionspec"
                description='version constraint specifier, eg. ">=4.0; ==2.0"'
                placeholder="Versionspec"
                _state={versionspec}
                _setState={setVersionspec}
              />
            </div>
            <div className="col">
              <SubmitField name="Query" handler={queryHandler} />
            </div>
          </div>
        </form>
      </div>

      <div id="versioninfo_list_table_toolbar" className="dt_toolbar">
        <div data-testid="versioninfo_list_table_toolbox" className={clsx('dt_toolbar_toolbox', !toolboxesVisible() && 'collapse')}>
          <div className="btn-group">
            <a className="btn btn-outline-secondary">
              <i className="fas fa-check-square"></i>
            </a>
            <a
              className="btn btn-outline-secondary"
              data-testid="versioninfo_select_all"
              href="#"
              title="select all"
              onClick={() => {
                const dt = getTableApi('versioninfo_list_table')
                dt.rows({ page: 'current' }).select()
              }}
            >
              All
            </a>
            <a
              className="btn btn-outline-secondary"
              data-testid="versioninfo_unselect_all"
              href="#"
              title="unselect all"
              onClick={() => {
                const dt = getTableApi('versioninfo_list_table')
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
              data-testid="versioninfo_set_multiple_tag"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'set',
                  tableId: 'versioninfo_list_table',
                  url: urlFor('/backend/storage/versioninfo/tag_multiid'),
                })
              }
            >
              <i className="fas fa-tag"></i>
            </a>
            {appConfig.tags.versioninfo.map((tag) => (
              <TagButton tag={tag} key={tag} url={urlFor("/backend/storage/versioninfo/tag_multiid")} tableId="versioninfo_list_table" />
            ))}
          </div>{' '}
          <div className="btn-group">
            <a
              className="btn btn-outline-secondary abutton_freetag_unset_multiid"
              href="#"
              data-testid="versioninfo_unset_multiple_tag"
              onClick={() =>
                setMultipleTag({
                  show: true,
                  action: 'unset',
                  tableId: 'versioninfo_list_table',
                  url: urlFor('/backend/storage/versioninfo/tag_multiid'),
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
                tags={appConfig.tags.versioninfo}
                url={urlFor("/backend/storage/versioninfo/tag_multiid")}
                tableId="versioninfo_list_table"
              />
            </div>
          </div>
        </div>
        <FilterForm url="/storage/versioninfo/list" />
      </div>

      <DataTable
        id="versioninfo_list_table"
        columns={columns}
        ajax_url={urlFor(`/backend/storage/versioninfo/list.json${toQueryString(searchParams)}`)}
        order={[[2, 'asc']]}
        select={toolboxesVisible() ? { style: 'multi', selector: 'td:first-child' } : false}
      />

      <AnnotateModal annotate={annotate} setAnnotate={setAnnotate} />
      <MultipleTagModal multipleTag={multipleTag} setMultipleTag={setMultipleTag} />
    </div>
  )
}
export default VersionInfosListPage
