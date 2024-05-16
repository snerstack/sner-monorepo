import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

import Heading from '@/components/Heading'
import SubmitField from '@/components/fields/SubmitField'
import TextField from '@/components/fields/TextField'

type Result = {
  address: string
  hostname: string
  os?: string
  services?: {
    info: string
    port: number
    proto: string
    state: string
  }[]
}

const HostRangePage = () => {
  const [addressRange, setAddressRange] = useState<string>('')
  const [result, setResult] = useState<Result[]>([])

  const hostsHandler = async () => {
    try {
      const res = await httpClient.post<Result[]>(urlFor('/backend/pubux/storage/range'), {
        cidr: addressRange,
      })

      setResult(res.data)
    } catch (error) {
      toast.error("Couldn't get hosts.")
    }
  }

  return (
    <div>
      <Helmet>
        <title>External / Host / Single - sner4</title>
      </Helmet>
      <Heading headings={['External', 'Host', 'Range']}>
        <div className="breadcrumb-buttons pl-2"></div>
      </Heading>
      <div>
        <TextField
          _state={addressRange}
          _setState={setAddressRange}
          name="ip-address-range"
          label="Range of IP addresses"
          placeholder="10.0.0.0/8"
          required
        />
        <SubmitField handler={hostsHandler} name="Get hosts" />
      </div>
      <div>
        {result.length > 0 && (
          <div>
            <h2 className="font-weight-bolder">Hosts</h2>
            {result.map((host) => (
              <div key={host.address} className="border d-flex flex-column m-1 py-3 px-2">
                <h3>
                  {host.address} {host.hostname}
                </h3>
                {host.os && <p>{host.os}</p>}
                <div>
                  {host.services && (
                    <>
                      <h3 className="font-weight-bolder">Services</h3>
                      <div className="d-flex flex-column">
                        {host.services.map((service) => (
                          <div key={service.port} className="border d-flex flex-column m-1 py-3 px-2">
                            <h3>
                              {service.port}/{service.proto}
                            </h3>
                            <p>{service.state}</p>
                            <p>{service.info}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
export default HostRangePage
