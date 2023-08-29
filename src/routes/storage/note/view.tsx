import { escapeHtml } from '@/utils'
import clsx from 'clsx'
import { Link, useLoaderData } from 'react-router-dom'

import { getColorForTag, getLinksForService } from '@/lib/sner/storage'

import DeleteButton from '@/components/Buttons/DeleteButton'
import Heading from '@/components/Heading'

const NoteViewPage = () => {
  const note = useLoaderData() as Note

  return (
    <div>
      <Heading headings={['Note', `${note.address} ${note.hostname || ''}`, note.xtype]}>
        <div className="breadcrumb-buttons pl-2">
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
                <a className="dropdown-item disabled">created: {note.created}</a>
                <a className="dropdown-item disabled">modified: {note.modified}</a>
                <a className="dropdown-item disabled">import_time: {note.import_time || ''}</a>
              </div>
            </div>
            <a className="btn btn-outline-primary" href={`/storage/note/edit/${note.id}`} title="Edit">
              <i className="fas fa-edit"></i>
            </a>
          </div>{' '}
          <DeleteButton url={`/storage/note/delete/${note.id}`} />
        </div>
      </Heading>

      <table className="table table-bordered table-sm w-auto">
        <tbody>
          <tr>
            <th>host</th>
            <td>
              <Link to={`/storage/host/view/${note.host_id}`}>{note.address}</Link> {note.hostname}
            </td>
            <th>service</th>
            <td className="service_endpoint_dropdown">
              <div className="dropdown d-flex">
                {note.service_id ? (
                  <a className="flex-fill" data-toggle="dropdown">
                    {'<'}Service {note.service_id}: {note.address} {note.service_proto}.{note.service_port}
                    {'>'}
                  </a>
                ) : (
                  'No service'
                )}
                <div className="dropdown-menu">
                  <h6 className="dropdown-header">Service endpoint URIs</h6>
                  {getLinksForService(note.address, note.hostname, note.service_proto, note.service_port).map(
                    (link) => (
                      <span className="dropdown-item">
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
            <td>{note.via_target ? note.via_target : 'None'}</td>
          </tr>
          <tr>
            <th>xtype</th>
            <td>{note.xtype}</td>
            <th>tags</th>
            <td className="abutton_annotate_view" colSpan={3}>
              {note.tags.map((tag) => (
                <>
                  <span className={clsx('badge tag-badge', getColorForTag(tag))}>{tag}</span>{' '}
                </>
              ))}
            </td>
          </tr>
          <tr>
            <th>comment</th>
            <td className="abutton_annotate_view" colSpan={5}>
              {note.comment}
            </td>
          </tr>
        </tbody>
      </table>

      {note.xtype && (note.xtype.startsWith('nmap.') || note.xtype.startsWith('nessus.')) ? (
        <pre>{note.data}</pre>
      ) : note.xtype === 'screenshot_web' ? (
        <>
          <h2>URL</h2> {JSON.parse(note.data)['url']}
          <h2>Screenshot</h2>
          <img src={`data:image/png;base64,${JSON.parse(note.data)['img']}`} className="border border-dark" />
        </>
      ) : note.xtype === 'testssl' ? (
        <>
          <h2>Findings</h2>
          {JSON.parse(note.data).hasOwnProperty('findings') && (
            <table className="table table-sm table-hover">
              <tr>
                <th>section</th>
                <th>severity</th>
                <th>id</th>
                <th>finding</th>
                <th>cve</th>
                <th>data</th>
              </tr>
              {Object.keys(JSON.parse(note.data)['findings']).map((section) =>
                JSON.parse(note.data)['findings'][section].map((item) => (
                  <tr>
                    <td>{section}</td>
                    <td>{item.severity}</td>
                    <td>{item.id}</td>
                    <td>{item.finding}</td>
                    <td>{item.cve}</td>
                    <td>{JSON.stringify(item)}</td>
                  </tr>
                )),
              )}
            </table>
          )}

          <h2>Certificate information</h2>
          <pre>{JSON.parse(note.data)['cert_txt']}</pre>

          <h2>Data</h2>
          <pre>{note.data}</pre>

          <h2>Full output</h2>
          <pre>{JSON.parse(note.data)['output']}</pre>
        </>
      ) : (
        <>{note.data}</>
      )}
    </div>
  )
}

export default NoteViewPage
