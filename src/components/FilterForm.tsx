import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const FilterForm = ({ url }: { url: string }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<string>('')

  useEffect(() => {
    if (searchParams.has('filter')) {
      setFilter(searchParams.get('filter') ?? '')
    }
  }, [searchParams])

  return (
    <form
      id="filter_form"
      className={clsx('form filter_bar collapse', searchParams.has('filter') && 'show')}
      data-testid="filter-form"
    >
      <div className="input-group flex-fill">
        <div className="input-group-prepend">
          <a className="btn btn-outline-secondary disabled">
            <i className="fas fa-filter"></i>
          </a>
          <Link
            data-testid="unfilter-btn"
            className="btn btn-info"
            to={url}
            onClick={() =>
              setSearchParams((params) => {
                params.set('filter', '')
                return params
              })
            }
          >
            Unfilter
          </Link>
        </div>
        <input
          className="form-control"
          type="text"
          name="filter"
          placeholder="Filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="input-group-append">
          <a
            data-testid="filter-btn"
            className="btn btn-outline-secondary"
            onClick={() => {
              setSearchParams((params) => {
                params.set('filter', filter)
                return params
              })
            }}
          >
            <i className="fa fa-search"></i>
          </a>
        </div>
      </div>
    </form>
  )
}
export default FilterForm
