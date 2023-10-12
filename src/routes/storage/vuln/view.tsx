import { escapeHtml } from '@/utils'
import clsx from 'clsx'
import { Fragment } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useLoaderData } from 'react-router-dom'

import {
  getColorForSeverity,
  getColorForTag,
  getLinksForService,
  getTextForRef,
  getUrlForRef,
} from '@/lib/sner/storage'

import DeleteButton from '@/components/Buttons/DeleteButton'
import EditButton from '@/components/Buttons/EditButton'
import MultiCopyButton from '@/components/Buttons/MultiCopyButton'
import TagButton from '@/components/Buttons/TagButton'
import Heading from '@/components/Heading'

const VulnViewPage = () => {
  const vuln = useLoaderData() as Vuln
  return (
    <div>
      <Helmet>
        <title>
          Vulns / View / {vuln.address} {vuln.hostname || ''} / {vuln.name} {vuln.xtype} - sner4
        </title>
      </Helmet>

      <Heading
        headings={[
          'Vuln',
          `${vuln.address} ${vuln.hostname || ''}`,
          `${vuln.name} ${vuln.xtype ? `(${vuln.xtype})` : ''}`,
        ]}
      >
        <div className="breadcrumb-buttons pl-2">
          <div className="btn-group">
            <a className="btn btn-outline-primary disabled">
              <i className="fas fa-tag text-primary"></i>
            </a>
            {import.meta.env.VITE_VULN_TAGS.split(',').map((tag) => (
              <TagButton tag={tag} key={tag} url="/storage/vuln/tag_multiid" id={vuln.id} />
            ))}
          </div>{' '}
          <div className="btn-group">
            <div className="btn-group dropdown dropleft">
              <a
                className="btn btn-outline-primary font-weight-bold"
                data-toggle="dropdown"
                href="#"
                title="Show more data"
              >
                <i className="fa fa-binoculars"></i>
              </a>
              <div className="dropdown-menu">
                <h6 className="dropdown-header">More data</h6>
                <a className="dropdown-item disabled">created: {vuln.created}</a>
                <a className="dropdown-item disabled">modified: {vuln.modified}</a>
                <a className="dropdown-item disabled">rescan_time: {vuln.rescan_time}</a>
                <a className="dropdown-item disabled">import_time: {vuln.import_time}</a>
              </div>
            </div>
            <a
              className="btn btn-outline-primary"
              href={`/storage/vuln/list?filter=Vuln.name=="${vuln.name}"`}
              title="Jump to same name vuln listing"
            >
              <i className="fas fa-list"></i>
            </a>
            <EditButton url={`/storage/vuln/edit/${vuln.id}`} />
            <MultiCopyButton url={`/storage/vuln/multicopy/${vuln.id}`} />
          </div>{' '}
          <DeleteButton url={`/storage/vuln/delete/${1}`} />
        </div>
      </Heading>

      <table className="table table-bordered table-sm w-auto">
        <tbody>
          <tr>
            <th>host</th>
            <td>
              <Link to={`/storage/host/view/${vuln.host_id}`}>{vuln.address}</Link> {vuln.hostname}
            </td>
            <th>service</th>
            <td className="service_endpoint_dropdown">
              <div className="dropdown d-flex">
                {vuln.service_id ? (
                  <a className="flex-fill" data-toggle="dropdown" data-testid="service_link">
                    {'<'}Service {vuln.service_id}: {vuln.address} {vuln.service_proto}.{vuln.service_port}
                    {'>'}
                  </a>
                ) : (
                  'No service'
                )}
                <div className="dropdown-menu">
                  <h6 className="dropdown-header">Service endpoint URIs</h6>
                  {getLinksForService(vuln.address, vuln.hostname, vuln.service_proto, vuln.service_port).map(
                    (link) => (
                      <span className="dropdown-item" key={link}>
                        <i className="far fa-clipboard" title="Copy to clipboard"></i>{' '}
                        <a rel="noreferrer" href={escapeHtml(link)}>
                          {escapeHtml(link)}
                        </a>
                      </span>
                    ),
                  )}
                </div>
              </div>
            </td>
            <th>via_target</th>
            <td>{vuln.via_target || 'None'}</td>
          </tr>
          <tr>
            <th>xtype</th>
            <td>{vuln.xtype || 'None'}</td>

            <th>severity</th>
            <td colSpan={3}>
              <span className={clsx('badge', getColorForSeverity(vuln.severity))}>{vuln.severity}</span>
            </td>
          </tr>
          <tr>
            <th>refs</th>
            <td>
              {vuln.refs.map((ref) => (
                <Fragment key={ref}>
                  <a rel="noreferrer" href={getUrlForRef(ref)}>
                    {getTextForRef(ref)}
                  </a>{' '}
                </Fragment>
              ))}
              {vuln.refs.length === 0 && 'None'}
            </td>
            <th>tags</th>
            <td className="abutton_annotate_view" colSpan={3}>
              {vuln.tags.map((tag) => (
                <Fragment key={tag}>
                  <span className={clsx('badge tag-badge', getColorForTag(tag))}>{tag}</span>{' '}
                </Fragment>
              ))}
            </td>
          </tr>
          <tr>
            <th>comment</th>
            <td className="abutton_annotate_view" colSpan={5}>
              {vuln.comment || 'No comment'}
            </td>
          </tr>
        </tbody>
      </table>
      <h2>Description</h2>
      <div>
        {vuln.descr && (
          <>
            {vuln.xtype && vuln.xtype.startsWith('nessus.') ? (
              <>
                {vuln.descr.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </>
            ) : (
              <pre>{vuln.descr}</pre>
            )}
          </>
        )}
      </div>

      <h2>Data</h2>
      <div>{vuln.xtype && vuln.xtype.startsWith('nuclei.') ? <pre>{vuln.data}</pre> : <pre>{vuln.data}</pre>}</div>
    </div>
  )
}
export default VulnViewPage
