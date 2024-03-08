import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { toast } from 'react-toastify'
import { useRecoilValue } from 'recoil'

import { apikeyState } from '@/atoms/apikeyAtom'

import httpClient from '@/lib/httpClient'

import CollapseMenu from '@/components/CollapseMenu'
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
    notes: {
      data: string
      xtype: string
    }[]
  }[]
  notes?: {
    data: string
    xtype: string
    comment: string
  }[]
}

const HostSinglePage = () => {
  const apikey = useRecoilValue(apikeyState)
  const [address, setAddress] = useState<string>('')
  const [result, setResult] = useState<Result>({ address: '', hostname: '' })

  const hostHandler = async () => {
    try {
      const res = await httpClient.post<Result>(
        import.meta.env.VITE_SERVER_URL + '/api/v2/public/storage/host',
        { address },
        {
          headers: {
            'X-API-KEY': apikey,
          },
          withCredentials: false,
        },
      )

      setResult(res.data)
    } catch (error) {
      toast.error("Couldn't get host.")
    }
  }

  return (
    <div>
      <Helmet>
        <title>External / Host / Single - sner4</title>
      </Helmet>
      <Heading headings={['External', 'Host', 'Single']}>
        <div className="breadcrumb-buttons pl-2"></div>
      </Heading>
      <div>
        <TextField
          _state={address}
          _setState={setAddress}
          name="ip-address"
          label="IP address"
          placeholder="IP address"
          required
        />
        <SubmitField handler={hostHandler} name="Get host" />
      </div>
      <div>
        {result && (
          <div>
            <h2>
              {result.address} {result.hostname}
            </h2>
            {result.os && <p>{result.os}</p>}
            <div>
              {result.services && (
                <>
                  <h3>Services</h3>
                  <div className="d-flex flex-column">
                    {result.services.map((service) => (
                      <div key={service.port} className="border d-flex flex-column m-1 py-3 px-2">
                        <h3>
                          {service.port}/{service.proto}
                        </h3>
                        <p>{service.state}</p>
                        <p>{service.info}</p>
                        {service.notes && (
                          <CollapseMenu label="Notes">
                            <>
                              {service.notes.map((note) => (
                                <div key={note.data} className="border mb-1 d-flex flex-column">
                                  <p>{note.xtype}</p>
                                  <small>{note.data}</small>
                                </div>
                              ))}
                            </>
                          </CollapseMenu>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div>
              {result.notes && (
                <>
                  <h3>Notes</h3>
                  <div className="d-flex flex-column">
                    {result.notes.map((note) => (
                      <div key={note.data} className="border d-flex flex-column m-1 py-3 px-2">
                        <h3>{note.xtype}</h3>
                        <p>{note.data}</p>
                        <p>{note.comment}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default HostSinglePage
