import { useState } from 'react'
import { Helmet } from 'react-helmet-async'

import httpClient from '@/lib/httpClient'

import CodeBlock from '@/components/CodeBlock'
import Heading from '@/components/Heading'
import SubmitField from '@/components/fields/SubmitField'
import TextField from '@/components/fields/TextField'

type Result = {
  host_address: string
  host_hostname: string
  product: string
  port: number
  service_port: string
  service_proto: string
  version: string
  extra: Record<string, unknown>
}

const ProductsPage = () => {
  const [filter, setFilter] = useState<string>('')
  const [product, setProduct] = useState<string>('')
  const [versionspec, setVersionspec] = useState<string>('')
  const [result, setResult] = useState<Result[]>([])

  const productsHandler = async () => {
    const res = await httpClient.post<Result[]>(import.meta.env.VITE_SERVER_URL + '/pubux/storage/versioninfo', {
      filter,
      product,
      versionspec,
    })

    setResult(res.data)
  }

  return (
    <div>
      <Helmet>
        <title>External / Products - sner4</title>
      </Helmet>
      <Heading headings={['External', 'Versioninfo', 'Products']}>
        <div className="breadcrumb-buttons pl-2"></div>
      </Heading>
      <div>
        <TextField _state={filter} _setState={setFilter} name="filter" label="Filter" placeholder="Filter" />
        <TextField _state={product} _setState={setProduct} name="product" label="Product" placeholder="Product" />
        <TextField
          _state={versionspec}
          _setState={setVersionspec}
          name="version-spec"
          label="Version spec"
          placeholder=">=2"
        />
        <SubmitField handler={productsHandler} name="Get products" />
      </div>
      <div>
        {result.length > 0 && (
          <div>
            <h2 className="font-weight-bolder">Exposed products</h2>
            {result.map((product, i) => (
              <div key={i} className="border d-flex flex-column m-1 py-3 px-2">
                <h3>
                  {product.product} {product.version}
                </h3>

                <div>
                  <p>
                    {product.host_address} {product.host_hostname}
                  </p>
                  <p>
                    {product.service_port}/{product.service_proto}
                  </p>
                  {product.extra && Object.keys(product.extra).length !== 0 && (
                    <CodeBlock language="language-json" data={JSON.stringify(product.extra, null, 2)} />
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
export default ProductsPage
