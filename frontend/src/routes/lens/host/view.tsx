import clsx from 'clsx';
import { Helmet } from 'react-helmet-async';
import { Link, useLoaderData } from 'react-router-dom';

import AnchorLinkJumpFix from '@/components/AnchorLinkJumpFix';
import Heading from '@/components/Heading';
import { getColorForSeverity } from '@/lib/sner/storage';

import "@/styles/lens.css";

const PreformattedData = ({ data }: { data: string }) => {
  let formattedData: string

  try {
    formattedData = JSON.stringify(JSON.parse(data), null, 2)
  } catch {
    formattedData = data
  }

  return <pre className="preformatted">{formattedData}</pre>
}

const NotesFeed = ({ notes }: { notes: LensNote[] }) => (
  <div>
    <div className="d-flex flex-wrap">
      {notes.map((note) => (
        <div key={note.id} className="badge badge-secondary p-2 mr-2 mb-2">
          {note.xtype}
        </div>
      ))}
    </div>
    {notes.map((note) => (
      <div key={note.id}>
        <h4>{note.xtype}</h4>
        <PreformattedData data={note.data} />
      </div>
    ))}
  </div>
)

const HostNotesCard = ({ allNotes }: { allNotes: LensNote[] }) => {
  const hostNotes = allNotes.filter((note) => note.service_id === null)
  return (
    <div className="card lens-host-notes">
      <div className="card-body">
        <NotesFeed notes={hostNotes} />
      </div>
    </div>
  )
}

const ServiceCard = ({ service, allNotes }: { service: LensService, allNotes: LensNote[] }) => {
  const serviceNotes = allNotes.filter((note) => service._notes_ids.includes(note.id))
  return (
    <div id={`service-${service.id}`} className="lens-host-service card">
      <div className="card-header d-flex justify-content-between">
        <span>{service.port} / {service.proto} / {service.state}</span>
        <Link to="#" className="text-primary">
          <i className="fas fa-angle-double-up"></i>
        </Link>
      </div>
      <div className="card-body">
        {service.info && <div className="lens-host-service-info">{service.info}</div>}
        {serviceNotes.length > 0 && <NotesFeed notes={serviceNotes} />}
      </div>
    </div>
  )
}

const VulnCard = ({ vuln }: { vuln: LensVuln }) => (
  <div id={`vuln-${vuln.id}`} className="lens-host-vuln card">
    <div className="card-header d-flex justify-content-between">
      <span>
        [ {vuln._service_ident} ]
        <span className={clsx('badge', getColorForSeverity(vuln.severity), 'mx-2')}>{vuln.severity}</span>
        {vuln.name} ({vuln.xtype})
      </span>
      <Link to="#" className="text-primary">
        <i className="fas fa-angle-double-up"></i>
      </Link>
    </div>
    <div className="card-body">
      <PreformattedData data={vuln.descr} />
      <hr />
      <PreformattedData data={vuln.data} />
    </div>
  </div>
)

const LensHostViewPage = () => {
  const host = useLoaderData() as LensHost
  const hostNotesCount = host.notes.filter(note => note.service_id === null).length

  return (
    <div>
      <AnchorLinkJumpFix />

      <Helmet>
        <title>Lens / Host - SNER</title>
      </Helmet>
      <Heading headings={['Lens', 'Host', host.address]} />

      <div className="lens-host-overview d-flex w-100">
        <div className="lens-host-hostinfo card w-50 mr-2" data-testid="lens-host-hostinfo">
          <div className="card-header">
            Host Info
            <div className="float-right">
              <Link to="#hostnotes" title="Host notes" className="d-inline-block">
                <span className="badge badge-info badge-pill">{hostNotesCount}</span>
              </Link>
              <Link to={`/storage/host/view/${host.id}`} title="Link to storage" className="d-inline-block ml-2">
                <i className="fas fa-database text-secondary align-middle"></i>
              </Link>
            </div>
          </div>
          <div className="card-body">
            <table>
              <tbody>
                <tr><th>Address</th><td>{host.address}</td></tr>
                <tr><th>Hostname</th><td>{host.hostname}</td></tr>
                <tr><th>OS <i className="fa fa-exclamation text-warning" title="Detection is known to be very inaccurate."></i></th><td>{host.os}</td></tr>
                <tr><th>Comment</th><td>{host.comment}</td></tr>
                <tr><th>Tags</th><td>{host.tags}</td></tr>
                <tr><th>Created</th><td>{host.created}</td></tr>
                <tr><th>Modified</th><td>{host.modified}</td></tr>
                <tr><th>Rescan Time</th><td>{host.rescan_time}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="lens-host-ports card w-50 ml-2">
          <div className="card-header">
            <Link to="#services">
              Services
              <span className="badge badge-info ml-2">{host.services.length}</span>
            </Link>
          </div>
          <div className="card-body">
            {host.services.map((service) => (
              <Link
                key={service.id}
                to={`#service-${service.id}`}
                className="lens-host-port-link"
                title={`[${service.state}] ${service.info}`}
              >
                {service.port} / {service.proto}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="card lens-host-vulnstoc">
        <div className="card-header">
          <Link to="#vulns">
            Vulnerabilities
            <span className="badge badge-info ml-2">{host.vulns.length}</span>
          </Link>
        </div>
        <div className="card-body">
          <ul className="list-unstyled">
            {host.vulns.map((vuln) => (
              <li key={vuln.id} className="d-flex py-0 hover-bg">
                <span className="text-monospace text-nowrap small col-1 text-right">[ {vuln._service_ident} ]</span>
                <span className="col-1 text-center">
                  <span className={clsx('badge', getColorForSeverity(vuln.severity), 'mx-3')}>{vuln.severity}</span>
                </span>
                <Link to={`#vuln-${vuln.id}`}>{vuln.name} ({vuln.xtype})</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="lens-host-hostnotes">
        <h2 id="hostnotes">Host notes</h2>
        <HostNotesCard allNotes={host.notes} />
      </div>

      <div className="lens-host-services">
        <h2 id="services">Services</h2>
        {host.services.map((service) => (
          <ServiceCard key={service.id} service={service} allNotes={host.notes} />
        ))}
      </div>

      <div className="lens-host-vulns">
        <h2 id="vulns">Vulns</h2>
        {host.vulns.map((vuln) => (
          <VulnCard key={vuln.id} vuln={vuln} />
        ))}
      </div>

    </div>
  )
}

export default LensHostViewPage
