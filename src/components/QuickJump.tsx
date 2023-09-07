import env from 'app-env'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import httpClient from '@/lib/httpClient'

const QuickJump = () => {
  const navigate = useNavigate()
  const [quickJumpValue, setQuickJumpValue] = useState<string>('')
  const [suggestions, setSuggestions] = useState<string[]>([])

  const autocompleteHandler = async (searchTerm: string) => {
    try {
      const resp = await httpClient.get<string[]>(
        env.VITE_SERVER_URL + `/storage/quickjump_autocomplete?term=${searchTerm}`,
      )

      setSuggestions(resp.data)
    } catch (err) {
      console.log(err)
    }
  }

  const quickJumpHandler = async (quickjump: string) => {
    const formData = new FormData()
    formData.append('quickjump', quickjump)

    try {
      const resp = await httpClient.post<{ url: string }>(env.VITE_SERVER_URL + '/storage/quickjump', formData)

      navigate(resp.data.url)

      setQuickJumpValue('')
      setSuggestions([])
    } catch (err) {
      toast.warn('Not found.')
    }
  }

  return (
    <div>
      <form
        className="form-inline position-relative"
        style={{ display: 'block' }}
        method="post"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void quickJumpHandler(quickJumpValue)
          }
        }}
      >
        <input
          className="form-control form-control-sm"
          type="text"
          name="quickjump"
          placeholder="Quick jump"
          title="Quick jump with address, hostname or port"
          value={quickJumpValue}
          onChange={(e) => {
            setQuickJumpValue(e.target.value)
            void autocompleteHandler(e.target.value)
          }}
        />
        {suggestions.length > 0 && (
          <ul className="position-absolute w-100 mt-1 list-unstyled bg-white text-break">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion}
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
                  void quickJumpHandler(suggestion)
                }}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  )
}
export default QuickJump
