import { Fragment, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useLoaderData } from 'react-router-dom'
import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'

const PortmapPage = () => {
  const { portstates, portmap } = useLoaderData() as {
    portstates: { count: number; state: string }[]
    portmap: { count: number; port: string; size: number }[]
  }
  const [portDetails, setPortDetails] = useState<PortDetails>({
    port: 0,
    portname: '',
    infos: [],
    stats: [],
    hosts: [],
    comments: [],
  })

  return (
    <div>
      <Helmet>
        <title>Visuals / Portmap - sner4</title>
      </Helmet>

      <Heading headings={['Visuals', 'Portmap']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-secondary" data-toggle="collapse" data-target="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div className="card">
        <h5 className="card-header">
          <a data-toggle="collapse" href="#portstates">
            Services port states
          </a>
        </h5>
        <div id="portstates" className="card-body collapse">
          <table className="dt_static table table-condensed table-hover">
            <thead>
              <tr>
                <th>port state</th>
                <th>state count</th>
                <th className="no-sort">_buttons</th>
              </tr>
            </thead>
            <tbody>
              {portstates.map(({ state, count }, index) => (
                <tr key={index}>
                  <td>{state}</td>
                  <td>{count}</td>
                  <td>
                    <Link to={`/visuals/portmap?filter=Service.state=="${state}"`}>
                      <i className="fas fa-filter"></i>
                    </Link>
                    <Link to={`/storage/service/list?filter=Service.state=="${state}"`}>
                      <i className="fas fa-list"></i>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dt_toolbar">
        <FilterForm url="/visuals/portmap_portstat" />
      </div>

      <div className="row py-1">
        <div className="col-md-6">
          {portmap.map(({ port, size }) => (
            <Fragment key={port}>
              <Link
                className="portmap_item"
                style={{ fontSize: `${size}px` }}
                to={`/storage/service/list?filter=Service.port=="${port}"`}
                onMouseEnter={() => {
                  httpClient
                    .get<PortDetails>(urlFor(`/backend/visuals/portmap_portstat/${port}.json`))
                    .then((resp) => setPortDetails(resp.data))
                    .catch(() => toast.error('Error while fetching data.'))
                }}
              >
                {port}&nbsp;
              </Link>{' '}
            </Fragment>
          ))}
        </div>
        {portDetails.port > 0 && (
          <div id="port_detail" className="col-md-6">
            <h2>
              Port {portDetails.port} {portDetails.portname ? `(${portDetails.portname})` : ''}
            </h2>

            <div className="py-1">
              {portDetails.stats.map(({ proto, count }, index) => (
                <Link
                  className="btn btn-outline-secondary"
                  to={`/storage/service/list?filter=Service.proto=="${proto}"`}
                  key={index}
                >
                  {proto} <span className="badge badge-secondary">{count}</span>
                </Link>
              ))}
            </div>

            {portDetails.infos.length > 0 && (
              <>
                <h3>Infos</h3>
                <table className="table table-hover table-sm borderless">
                  <tbody>
                    {portDetails.infos.map(({ info, count }, index) => (
                      <tr key={index}>
                        <td>
                          <Link to={`/storage/service/list?filter=Service.info=="${info}"`}>{info}</Link>
                        </td>
                        <td>{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <h3>Hosts</h3>
            <table className="table table-hover table-sm borderless">
              <tbody>
                {portDetails.hosts.map(({ host_address, host_hostname, host_id }) => (
                  <tr key={host_id}>
                    <td>
                      <Link to={`/storage/host/view/${host_id}`}>{host_address}</Link>
                    </td>
                    <td>{host_hostname || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
export default PortmapPage
