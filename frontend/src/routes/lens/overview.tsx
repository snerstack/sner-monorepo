import clsx from 'clsx'
import { Address4, Address6 } from 'ip-address'
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'

import Heading from '@/components/Heading'
import { handleHttpClientError, httpClient } from '@/lib/httpClient'
import { getColorForSeverity } from '@/lib/sner/storage'
import { urlFor } from '@/lib/urlHelper'

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info', 'unknown']

const LABELS: { [key: string]: string } = {
    hosts: 'Hosts',
    services: 'Services',
    vulns: 'Vulnerabilities',
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    info: 'Info',
    unknown: 'Unknown'
}

interface OldestScannedStats {
    longest_ago: number | null
    services: [{
        id: number
        host_id: number
        host_address: string
        proto: string
        port: number
        import_time: string
    }]
}

interface LensOverviewStats {
    objects: { [key: string]: number }
    vuln_severities: { [key: string]: number }
    allowed_networks: string[],
    oldest_scanned: OldestScannedStats
}

type IpVersion = 4 | 6

interface ParsedIp {
    version: IpVersion
    addr: Address4 | Address6
}

interface SortedIps {
    v4: string[]
    v6: string[]
}

function parseIp(ip: string): ParsedIp {
    if (ip.includes(':')) {
        return { version: 6, addr: new Address6(ip) }
    }
    return { version: 4, addr: new Address4(ip) }
}

function compareBigInt(a: bigint, b: bigint): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function sortIps(ips: string[]): SortedIps {
    const v4: { ip: string; sortValue: bigint }[] = []
    const v6: { ip: string; sortValue: bigint }[] = []

    for (const ip of ips) {
        const { version, addr } = parseIp(ip)
        const entry = { ip, sortValue: addr.bigInt() }
        if (version === 4) {
            v4.push(entry)
        } else {
            v6.push(entry)
        }
    }

    v4.sort((a, b) => compareBigInt(a.sortValue, b.sortValue))
    v6.sort((a, b) => compareBigInt(a.sortValue, b.sortValue))

    return {
        v4: v4.map((x) => x.ip),
        v6: v6.map((x) => x.ip),
    }
}

function severityFilterUrl(severity: string): string {
    return `/lens/vuln/list?jsonfilter=${JSON.stringify({
        combinator: 'and',
        rules: [{ field: 'Vuln.severity', operator: '==', value: severity }],
    })}`
}

const AllowedNetworks = ({ networks }: { networks: string[] }) => {
    const COLLAPSE_ID = "allowedNetworksCollapse"
    const sortedIps = sortIps(networks)

    return (
        <div className="card">
            <div
                className="card-header"
                data-toggle="collapse"
                data-target={`#${COLLAPSE_ID}`}
                style={{ cursor: 'pointer' }}
            >
                Allowed networks
                <span className="badge badge-secondary ml-3">{networks.length} items</span>
                <span className="float-right">
                    <i className="fas fa-chevron-down rotate-icon"></i>
                </span>
            </div>
            <div id={COLLAPSE_ID} className="collapse">
                <div className="card-body">
                    <div className="d-flex flex-wrap">
                        {sortedIps.v4.map((item, index) => (
                            <span key={index} className="btn btn-outline-dark mr-2 mb-2 disabled">
                                {item}
                            </span>
                        ))}
                    </div>
                    <div className="d-flex flex-wrap">
                        {sortedIps.v6.map((item, index) => (
                            <span key={index} className="btn btn-outline-dark mr-2 mb-2 disabled">
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

const ObjectsTable = ({ objects }: { objects: { [key: string]: number } }) => (
    <div className="card">
        <div className="card-header">Objects</div>
        <div className="card-body p-0">
            <table className="table table-hover mb-0">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Count</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(objects).map(([key, value]) => (
                        <tr key={key}>
                            <td className="text-capitalize">{LABELS[key]}</td>
                            <td>{value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
)

const SeverityTable = ({ vulnSeverities }: { vulnSeverities: { [key: string]: number } }) => (
    <div className="card">
        <div className="card-header">Vulnerability Severities</div>
        <div className="card-body p-0">
            <table className="table table-hover mb-0">
                <thead>
                    <tr>
                        <th>Severity</th>
                        <th>Count</th>
                    </tr>
                </thead>
                <tbody>
                    {SEVERITY_ORDER.map((severity) => (
                        <tr key={severity}>
                            <td className="text-capitalize">
                                <Link to={severityFilterUrl(severity)} style={{ textDecoration: 'none' }}>
                                    <span className={clsx('badge', getColorForSeverity(severity), 'p-2')}>{LABELS[severity]}</span>
                                </Link>
                            </td>
                            <td>{vulnSeverities[severity] ?? 0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
)

const OldestScanned = ({ scanned }: { scanned: OldestScannedStats }) => {
    const helpTooltip = (
        <Tooltip id="oldest-scanned-help">
            Services with the oldest scan timestamp.
            <p></p>
            As there is no single scan time for a whole network because scanning is continuous, the services listed here
            have the oldest &quot;last-seen timestamps&quot; and indicate how long ago the scanning cycle last reached services in the
            allowed networks for current user.
        </Tooltip>
    )

    return (
        <div className="card">
            <div className="card-header">
                Oldest service scans {scanned.longest_ago !== null && `(${scanned.longest_ago} days ago)`}
                <span className="float-right">
                    <OverlayTrigger placement="top" overlay={helpTooltip}>
                        <i className="fas fa-question-circle text-muted" style={{ cursor: 'help' }}></i>
                    </OverlayTrigger>
                </span>
            </div>
            <div className="card-body p-0">
                <table className="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th>Last scanned</th>
                            <th>Service</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scanned.services.map((item) => (
                            <tr key={item.id}>
                                <td>{item.import_time}</td>
                                <td><Link to={`/lens/host/view/${item.host_id}`}>{item.host_address} {item.proto}/{item.port}</Link></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}


const LensOverviewPage = () => {
    const [stats, setStats] = useState<LensOverviewStats | null>(null)

    useEffect(() => {
        httpClient.get<LensOverviewStats>(urlFor(`/backend/lens/overview.json`))
            .then((response) => setStats(response.data))
            /* c8 ignore next 4 */
            .catch((err) => {
                console.error(err)
                handleHttpClientError(err)
            })
    }, [])

    return (
        <div>
            <Helmet>
                <title>Lens / Overview - SNER</title>
            </Helmet>

            <Heading headings={['Lens', 'Overview']} />

            <div className="container">
                {!stats && (<p>Loading overview</p>)}
                {stats && (
                    <>
                        <div className="row pb-4">
                            <div className="col-lg-12">
                                <AllowedNetworks networks={stats.allowed_networks} />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-lg-6">
                                <ObjectsTable objects={stats.objects} />
                            </div>
                            <div className="col-lg-6">
                                <SeverityTable vulnSeverities={stats.vuln_severities} />
                            </div>
                        </div>

                        <div className="row pb-4">
                            <div className="col-lg-6">
                                <OldestScanned scanned={stats.oldest_scanned} />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default LensOverviewPage