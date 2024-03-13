import { useState } from 'react'
import { Helmet } from 'react-helmet-async'

import httpClient from '@/lib/httpClient'

import Heading from '@/components/Heading'
import SubmitField from '@/components/fields/SubmitField'
import TextField from '@/components/fields/TextField'

type Result = {
  address: string
  hostname: string
  info: string
  port: number
  proto: string
  state: string
}

const ServiceFilterPage = () => {
  const [filter, setFilter] = useState<string>('')
  const [result, setResult] = useState<Result[]>([])

  const serviceFilterHandler = async () => {
    const res = await httpClient.post<Result[]>(import.meta.env.VITE_SERVER_URL + '/pubux/storage/service/list', {
      filter,
    })

    setResult(res.data)
  }

  return (
    <div>
      <Helmet>
        <title>External / Service - sner4</title>
      </Helmet>
      <Heading headings={['External', 'Service']}>
        <div className="breadcrumb-buttons pl-2"></div>
      </Heading>
      <div>
        <TextField
          _state={filter}
          _setState={setFilter}
          name="filter"
          label="Filter"
          placeholder='Service.port==80 AND Service.state ilike "open:%"'
          required
        />
        <SubmitField handler={serviceFilterHandler} name="Get services" />
      </div>
      <div>
        {result.length > 0 && (
          <div>
            <h2 className="font-weight-bolder">Services</h2>
            {result.map((service, i) => (
              <div key={i} className="border d-flex flex-column m-1 py-3 px-2">
                <h3>
                  {service.proto}://{service.address}:{service.port}
                </h3>

                <div>
                  <p>{service.state}</p>
                  <p>{service.info}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
export default ServiceFilterPage
