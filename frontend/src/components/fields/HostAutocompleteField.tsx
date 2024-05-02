import clsx from 'clsx'
import { Dispatch, Fragment, SetStateAction, useEffect, useState } from 'react'
import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

const HostAutocompleteField = ({
  name = '',
  label = '',
  placeholder = '',
  minValue = 1,
  description = '',
  errors = [],
  required = false,
  horizontal = true,
  _state,
  _setState,
}: {
  name: string
  label: string
  placeholder: string
  minValue?: number
  description?: string
  errors?: string[]
  required?: boolean
  horizontal?: boolean
  _state: number
  _setState: Dispatch<SetStateAction<number>>
}) => {
  const [suggestions, setSuggestions] = useState<{ label: string; value: number }[]>([])
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false)

  const autocompleteHandler = async (searchTerm: string) => {
    try {
      const resp = await httpClient.get<{ label: string; value: number }[]>(
        urlFor(`/backend/storage/vuln_addedit_host_autocomplete?term=${searchTerm}`),
      )

      setSuggestions(resp.data)
      setShowSuggestions(true)
    } catch (err) {
      toast.error('Error while getting autocomplete suggestions.')
    }
  }

  useEffect(() => {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target?.id === 'host_id') return
      setShowSuggestions(false)
    })
  }, [])

  const HorizontalParent = horizontal ? 'div' : Fragment

  return (
    <div className={clsx('form-group position-relative', horizontal && 'row', required && 'required')}>
      <label className={clsx(horizontal && 'col-sm-2 col-form-label')} htmlFor={name}>
        {label}
      </label>
      <HorizontalParent {...(horizontal ? { className: 'col-sm-10' } : {})}>
        <div className="position-relative">
          <input
            className={clsx('form-control', errors.length > 0 && 'is-invalid')}
            type="number"
            placeholder={placeholder}
            name={name}
            id={name}
            required={required}
            value={_state}
            onChange={(e) => {
              _setState(e.target.valueAsNumber)
              void autocompleteHandler(e.target.value)
            }}
            onFocus={() => {
              if (_state) {
                void autocompleteHandler(_state.toString())
              }
            }}
            min={minValue}
          />
          {description && (
            <small className="form-text text-muted">
              <small>{description}</small>
            </small>
          )}
          {errors.length > 0 && (
            <div className="invalid-feedback">
              <small>{errors.join(' ')}</small>
            </div>
          )}
          {suggestions.length > 0 && showSuggestions && (
            <ul
              className="position-absolute w-100 list-unstyled bg-white text-break border"
              style={{ zIndex: 999 }}
              data-testid="host-autocomplete-list"
            >
              {suggestions.map((suggestion) => (
                <li
                  key={suggestion.value}
                  className="pl-1 py-1 cursor-pointer"
                  role="button"
                  onMouseEnter={(e) => {
                    const target = e.target as HTMLLIElement
                    target.style.background = '#007fff'
                    target.style.color = '#fff'
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLLIElement
                    target.style.background = '#fff'
                    target.style.color = '#000'
                  }}
                  onClick={() => {
                    _setState(suggestion.value)
                    setShowSuggestions(false)
                  }}
                >
                  {suggestion.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </HorizontalParent>
    </div>
  )
}
export default HostAutocompleteField
