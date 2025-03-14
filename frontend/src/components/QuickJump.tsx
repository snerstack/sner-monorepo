import { ChangeEvent, KeyboardEvent, MouseEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { httpClient } from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

const QuickJump = () => {
  const navigate = useNavigate()
  const [quickJumpValue, setQuickJumpValue] = useState<string>('')
  const [suggestions, setSuggestions] = useState<QuickJumpSuggestions>({
    hosts: [],
    services: [],
  })
  const [resultsIndex, setResultsIndex] = useState<number>(-1)

  useEffect(() => {
    hooveringHandler(resultsIndex)
  }, [resultsIndex])

  const autocompleteHandler = (e: ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value
    setQuickJumpValue(searchTerm)

    /*
      h, host, ip represents ip address
      p, port represents port number
    */
    const prefixes: string[] = ['h', 'host', 'ip', 'p', 'port']

    const extractedValues: { ip: string; port: string } = {
      ip: '',
      port: '',
    }

    searchTerm.split(/\s+(?=\S*:)/).forEach((str) => {
      const prefix = prefixes.find((p) => str.startsWith(p) && str.charAt(p.length) === ':')

      if (prefix) {
        const value = str
          .replace(prefix + ':', '')
          .trim()
          .split(' ')[0]

        const key = ['h', 'host', 'ip'].includes(prefix) ? 'ip' : 'port'

        extractedValues[key] = value
      }
    })

    httpClient
      .get<QuickJumpSuggestions>(urlFor('/backend/storage/quickjump_autocomplete'), {
        params: {
          ip: extractedValues.ip === '' ? null : extractedValues.ip,
          port: extractedValues.port === '' ? null : extractedValues.port,
          term: Object.values(extractedValues).every((x) => x === '') ? searchTerm : null,
        },
      })
      .then((resp) => {
        setSuggestions(resp.data)
      })
      .catch((e) => {
        /* c8 ignore next 3 */
        console.error(e)
        toast.error('Error while getting autocomplete suggestions.')
      })
  }

  const quickJumpHandler = (type: string, value: string) => {
    if (type === 'port') {
      navigate(`/storage/service/list?filter=Service.port==${value}`)
    } else {
      navigate(`/storage/host/view/${value}`)
    }

    setQuickJumpValue('')
    setSuggestions({ hosts: [], services: [] })
  }

  // wont test mouse events
  /* c8 ignore start */
  const hooveringHandler = (currentIndex: number) => {
    const items = document.getElementById('quickjump-form')!.querySelectorAll('li')
    items.forEach((item, index) => {
      if (index === currentIndex) {
        item.style.background = '#007fff'
        item.style.color = '#fff'
      } else {
        item.style.background = '#fff'
        item.style.color = '#000'
      }
    })
  }

  const onHooverHandler = (e: MouseEvent): void => {
    const target = e.target as HTMLLIElement
    target.style.background = '#007fff'
    target.style.color = '#fff'
  }

  const offHooverHandler = (e: MouseEvent) => {
    const target = e.target as HTMLLIElement
    target.style.background = '#fff'
    target.style.color = '#000'
  }

  const keysHandler = (e: KeyboardEvent) => {
    const items = document.getElementById('quickjump-form')!.querySelectorAll('li')
    if (items.length === 0) {
      setResultsIndex(-1)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (resultsIndex === -1) return
      quickJumpHandler(items[resultsIndex].dataset.type!, items[resultsIndex].dataset.value!)
    }

    if (e.key === 'ArrowUp') {
      setResultsIndex((prev) => {
        if (prev === -1 || prev === 0) return items.length - 1
        return prev - 1
      })
    }

    if (e.key === 'ArrowDown') {
      setResultsIndex((prev) => {
        if (prev === -1 || prev === items.length - 1) return 0
        return prev + 1
      })
    }
  }
  /* c8 ignore stop */

  return (
    <div className="bg-primary" style={{ width: '20%' }}>
      <form
        data-testid="quickjump-form"
        className="form-inline position-relative"
        id="quickjump-form"
        style={{ display: 'block' }}
        onKeyDown={keysHandler}
      >
        <input
          className="form-control form-control-sm w-100"
          type="text"
          name="quickjump"
          placeholder="Quick jump"
          title="Quick jump with address, hostname or port"
          value={quickJumpValue}
          onChange={autocompleteHandler}
        />
        {(suggestions.hosts.length > 0 || suggestions.services.length > 0) && (
          <ul className="position-absolute w-100 mt-1 list-unstyled bg-white text-break" data-testid="quickjump-list">
            <>
              {suggestions.hosts.length > 0 && (
                <>
                  <div className="border-bottom">
                    <h4 className="mb-0 pl-1 py-1">Hosts</h4>
                  </div>
                  {suggestions.hosts.map((suggestion) => (
                    <li
                      key={suggestion.label}
                      className="pl-1 py-1 cursor-pointer"
                      role="button"
                      onMouseEnter={onHooverHandler}
                      onMouseLeave={offHooverHandler}
                      /* c8 ignore next 3 */
                      onClick={() => {
                        quickJumpHandler('host', suggestion.host_id.toString())
                      }}
                      data-type="host"
                      data-value={suggestion.host_id.toString()}
                    >
                      {suggestion.label}
                    </li>
                  ))}
                </>
              )}
              {suggestions.services.length > 0 && (
                <>
                  <div className="border-bottom">
                    <h4 className="mb-0 pl-1 pt-1">Service ports</h4>
                    <small className="pl-1 pb-1 text-secondary">Filter by ports below</small>
                  </div>
                  {suggestions.services.map((suggestion) => (
                    <li
                      key={suggestion.label}
                      className="pl-1 py-1 cursor-pointer"
                      role="button"
                      onMouseEnter={onHooverHandler}
                      onMouseLeave={offHooverHandler}
                      /* c8 ignore next 3 */
                      onClick={() => {
                        quickJumpHandler('port', suggestion.port.toString())
                      }}
                      data-type="port"
                      data-value={suggestion.port.toString()}
                    >
                      {suggestion.label}
                    </li>
                  ))}
                </>
              )}
            </>
          </ul>
        )}
      </form>
    </div>
  )
}
export default QuickJump
