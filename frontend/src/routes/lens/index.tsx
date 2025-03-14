import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

import Heading from '@/components/Heading'

const Tile = ({
    to,
    icon,
    caption,
}: {
    to: string,
    icon: string,
    caption: string,
}) => (
    <Link
        to={to}
        style={{
            textDecoration: "none",
            color: "inherit",
        }}
    >
        <div className="card d-flex flex-column justify-content-center align-items-center m-2 p-4" style={{ width: "17rem" }}>
            <i className={`${icon} fa-5x`}></i>
            <h4 className="mt-4">{caption}</h4>
        </div>
    </Link>
)

const LensPage = () => (
    <div>
        <Helmet>
            <title>Lens - SNER</title>
        </Helmet>

        <Heading headings={['Lens']} />

        <div className="d-flex justify-content-center">
            <div className="d-flex flex-row p-5 m-5">
                <Tile to={"/lens/host/list"} icon="fas fa-server" caption="Hosts" />
                <Tile to={"/lens/service/list"} icon="fas fa-cogs" caption="Services" />
                <Tile to={"/lens/vuln/list"} icon="fas fa-question-circle" caption="Vulnerabilities" />
            </div>
        </div>


    </div>
)

export default LensPage
