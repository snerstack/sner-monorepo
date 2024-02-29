import clsx from 'clsx'
import { Fragment, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useLoaderData } from 'react-router-dom'

import { getColorForSeverity, getTextForRef, getUrlForRef } from '@/lib/sner/storage'
import { urlFor } from '@/lib/urlHelper'

import Heading from '@/components/Heading'
import ServiceEndpointDropdown from '@/components/ServiceEndpointDropdown'
import DeleteButton from '@/components/buttons/DeleteButton'
import DropdownButton from '@/components/buttons/DropdownButton'
import EditButton from '@/components/buttons/EditButton'
import MultiCopyButton from '@/components/buttons/MultiCopyButton'
import Tag from '@/components/buttons/Tag'
import TagButton from '@/components/buttons/TagButton'
import AnnotateModal from '@/components/modals/AnnotateModal'

import config from '../../../../config.ts'

const VulnViewPage = () => {
  const vuln = useLoaderData() as Vuln
  const [annotate, setAnnotate] = useState<Annotate>({
    show: false,
    tags: vuln.tags,
    comment: vuln.comment,
    url: urlFor(`/backend/storage/vuln/annotate/${vuln.id}`),
  })
  return (
    <div>
      <Helmet>
        <title>
          Vulns / View / {vuln.address}
          {vuln.hostname ? ' ' + vuln.hostname + ' ' : ''} / {vuln.name}
          {vuln.xtype ? ' ' + vuln.xtype : ''} - sner4
        </title>
      </Helmet>

      <Heading
        headings={[
          'Vuln',
          `${vuln.address}${vuln.hostname ? ' ' + vuln.hostname : ''}`,
          `${vuln.name}${vuln.xtype ? ` (${vuln.xtype})` : ''}`,
        ]}
      >
        <div className="breadcrumb-buttons pl-2">
          <div className="btn-group">
            <a className="btn btn-outline-primary disabled">
              <i className="fas fa-tag text-primary"></i>
            </a>
            {config.tags.vuln.map((tag) => (
              <TagButton
                tag={tag}
                key={tag}
                url={urlFor("/backend/storage/vuln/tag_multiid")}
                id={vuln.id}
                reloadPage={true}
                className="btn text-primary btn-outline-primary"
              />
            ))}
          </div>{' '}
          <div className="btn-group">
            <div className="btn-group dropdown dropleft">
              <DropdownButton
                title="More data"
                options={[
                  {
                    name: 'created',
                    data: vuln.created,
                  },
                  {
                    name: 'modified',
                    data: vuln.modified,
                  },
                  {
                    name: 'rescan_time',
                    data: vuln.rescan_time,
                  },

                  {
                    name: 'import_time',
                    data: vuln.import_time,
                  },
                ]}
                small={false}
              />
            </div>
            <a
              className="btn btn-outline-primary"
              href={`/storage/vuln/list?filter=Vuln.name=="${vuln.name}"`}
              title="Jump to same name vuln listing"
            >
              <i className="fas fa-list"></i>
            </a>
            <EditButton url={`/storage/vuln/edit/${vuln.id}`} className="btn btn-outline-primary" />
            <MultiCopyButton url={`/storage/vuln/multicopy/${vuln.id}`} className="btn btn-outline-primary" />
          </div>{' '}
          <DeleteButton url={urlFor(`/backend/storage/vuln/delete/${vuln.id}`)} className="btn btn-outline-primary" />
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
              <ServiceEndpointDropdown
                service={
                  vuln.service_id
                    ? `<Service ${vuln.service_id}: ${vuln.address} ${vuln.service_proto}.${vuln.service_port}>`
                    : 'No service'
                }
                address={vuln.address}
                hostname={vuln.hostname}
                proto={vuln.service_proto}
                port={vuln.service_port}
              />
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
            <td
              className="abutton_annotate_view"
              data-testid="vuln_tags_annotate"
              colSpan={3}
              onDoubleClick={() =>
                setAnnotate({
                  ...annotate,
                  show: true,
                })
              }
            >
              {vuln.tags.map((tag) => (
                <Fragment key={tag}>
                  <Tag tag={tag} />{' '}
                </Fragment>
              ))}
            </td>
          </tr>
          <tr>
            <th>comment</th>
            <td
              className="abutton_annotate_view"
              data-testid="vuln_comment_annotate"
              colSpan={5}
              onDoubleClick={() =>
                setAnnotate({
                  ...annotate,
                  show: true,
                })
              }
            >
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
      <AnnotateModal annotate={annotate} setAnnotate={setAnnotate} />
    </div>
  )
}
export default VulnViewPage
