import { Fragment, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useLoaderData } from 'react-router-dom'

import { urlFor } from '@/lib/urlHelper'

import Heading from '@/components/Heading'
import ServiceEndpointDropdown from '@/components/ServiceEndpointDropdown'
import Tag from '@/components/Tag'
import DeleteButton from '@/components/buttons/DeleteButton'
import DropdownButton from '@/components/buttons/DropdownButton'
import EditButton from '@/components/buttons/EditButton'
import AnnotateModal from '@/components/modals/AnnotateModal'
import { DEFAULT_ANNOTATE_STATE } from '@/lib/sner/storage'

type ScreenshotWeb = {
  url: string
  img: string
}

type TestSsl = {
  findings: {
    [key: string]: {
      severity: string
      id: string
      finding: string
      cve: string
      data: string
    }[]
  }
  cert_txt: string
  output: string
}

const NoteViewPage = () => {
  const note = useLoaderData() as Note
  const [noteTags, setNoteags] = useState(note.tags)
  const [noteComment, setNoteComment] = useState(note.comment)
  const [annotate, setAnnotate] = useState<Annotate>(DEFAULT_ANNOTATE_STATE)

  const refreshAnnotations = (newTags: string[], newComment: string): void => {
    setNoteags(newTags)
    setNoteComment(newComment)
  }

  const dblClickAnnotateHandler = (): void => {
    setAnnotate({
      show: true,
      tags: noteTags,
      comment: noteComment,
      url: urlFor(`/backend/storage/note/annotate/${note.id}`),
      refresh: refreshAnnotations
    })
  }

  return (
    <div>
      <Helmet>
        <title>
          Notes / View / {note.address}
          {note.hostname ? ' ' + note.hostname : ''} / {note.xtype} - sner4
        </title>
      </Helmet>
      <Heading headings={['Note', `${note.address}${note.hostname ? ' ' + note.hostname : ''}`, note.xtype]}>
        <div className="breadcrumb-buttons pl-2">
          <div className="btn-group">
            <DropdownButton
              title="More data"
              options={[
                {
                  name: 'created',
                  data: note.created,
                },
                {
                  name: 'modified',
                  data: note.modified,
                },

                {
                  name: 'import_time',
                  data: note.import_time || '',
                },
              ]}
              small={false}
            />
            <EditButton url={`/storage/note/edit/${note.id}`} className="btn btn-outline-primary" />
          </div>{' '}
          <DeleteButton url={urlFor(`/storage/note/delete/${note.id}`)} />
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
              <ServiceEndpointDropdown
                service={`<Service ${note.service_id}: ${note.address} ${note.service_proto}.${note.service_port}>`}
                address={note.address}
                hostname={note.hostname}
                proto={note.service_proto}
                port={note.service_port}
              />
            </td>
            <th>via_target</th>
            <td>{note.via_target ? note.via_target : 'None'}</td>
          </tr>
          <tr>
            <th>xtype</th>
            <td>{note.xtype}</td>
            <th>tags</th>
            <td
              className="abutton_annotate_view"
              data-testid="note_tags_annotate"
              colSpan={3}
              onDoubleClick={dblClickAnnotateHandler}
            >
              {noteTags.map((tag) => (
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
              colSpan={5}
              data-testid="note_comment_annotate"
              onDoubleClick={dblClickAnnotateHandler}
            >
              {noteComment}
            </td>
          </tr>
        </tbody>
      </table>

      {note.xtype && (note.xtype.startsWith('nmap.') || note.xtype.startsWith('nessus.')) ? (
        <pre>{note.data}</pre>
      ) : note.xtype === 'screenshot_web' ? (
        <>
          <h2>URL</h2> {(JSON.parse(note.data) as ScreenshotWeb)['url']}
          <h2>Screenshot</h2>
          <img
            src={`data:image/png;base64,${(JSON.parse(note.data) as ScreenshotWeb)['img']}`}
            className="border border-dark"
          />
        </>
      ) : note.xtype === 'testssl' ? (
        <>
          <h2>Findings</h2>
          {Object.prototype.hasOwnProperty.call(JSON.parse(note.data), 'findings') && (
            <table className="table table-sm table-hover">
              <thead>
                <tr>
                  <th>section</th>
                  <th>severity</th>
                  <th>id</th>
                  <th>finding</th>
                  <th>cve</th>
                  <th>data</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys((JSON.parse(note.data) as TestSsl)['findings']).map((section) =>
                  (JSON.parse(note.data) as TestSsl)['findings'][section].map((item) => (
                    <tr key={item.id}>
                      <td>{section}</td>
                      <td>{item.severity}</td>
                      <td>{item.id}</td>
                      <td>{item.finding}</td>
                      <td>{item.cve}</td>
                      <td>{JSON.stringify(item)}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          )}

          <h2>Certificate information</h2>
          <pre>{(JSON.parse(note.data) as TestSsl)['cert_txt']}</pre>

          <h2>Data</h2>
          <pre>{note.data}</pre>

          <h2>Full output</h2>
          <pre>{(JSON.parse(note.data) as TestSsl)['output']}</pre>
        </>
      ) : (
        <>{note.data}</>
      )}
      <AnnotateModal annotate={annotate} setAnnotate={setAnnotate} />
    </div>
  )
}

export default NoteViewPage
