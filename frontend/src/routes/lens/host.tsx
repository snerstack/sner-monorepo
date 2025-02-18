import { Helmet } from 'react-helmet-async';
import { Link, useLoaderData } from 'react-router-dom';

import Heading from '@/components/Heading';
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
      <div className="card-header">{service.port} / {service.proto} / {service.state}</div>
      <div className="card-body">
        {service.info && <div className="lens-host-service-info">{service.info}</div>}
        {serviceNotes.length > 0 && <NotesFeed notes={serviceNotes} />}
      </div>
    </div>
  )
}

const VulnCard = ({ vuln }: { vuln: LensVuln }) => (
  <div id={`vuln-${vuln.id}`} className="lens-host-vuln card">
    <div className="card-header">[ {vuln._service_ident} ] {vuln.name} ({vuln.xtype})</div>
    <div className="card-body">
      <PreformattedData data={vuln.descr} />
      <hr />
      <PreformattedData data={vuln.data} />
    </div>
  </div>
)

const LensHostPage = () => {
  const host = useLoaderData() as LensHost
  const hostNotesCount = host.notes.filter(note => note.service_id === null).length

  return (
    <div>
      <Helmet>
        <title>Lens - SNER</title>
      </Helmet>
      <Heading headings={['Lens', 'Host', host.address]} />

      <div className="lens-host-overview d-flex w-100">
        <div className="lens-host-hostinfo card w-50 mr-2">
          <div className="card-header">
            Host Info
            <Link to={`/storage/host/view/${host.id}`}>
              <i className="fas fa-database text-secondary float-right"></i>
            </Link>
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
          <div className="card-header">Ports</div>
          <div className="card-body">
            {host.services.map((service) => (
              <a key={service.id} className="lens-host-port-link" href={`#service-${service.id}`}>
                {service.port} / {service.proto}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="lens-host-toc">
        <ul className="list-group mt-2">
          <li className="list-group-item">
            <a href="#hostnotes">
              Host notes
              <span className="badge badge-info ml-2">{hostNotesCount}</span>
            </a>
          </li>
          <li className="list-group-item">
            <a href="#services">
              Services
              <span className="badge badge-info ml-2">{host.services.length}</span>
            </a>
          </li>
          <li className="list-group-item">
            <a href="#vulns">
              Vulnerabilities
              <span className="badge badge-info ml-2">{host.vulns.length}</span>
            </a>
            <div>
              <ul>
                {host.vulns.map((vuln) => (
                  <li key={vuln.id}><a href={`#vuln-${vuln.id}`}>[ {vuln._service_ident} ] {vuln.name}</a></li>
                ))}
              </ul>
            </div>
          </li>
        </ul>
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

export default LensHostPage
