import { vi, expect, it, describe, beforeEach } from 'vitest'
import { toast } from 'react-toastify'
import { handleHttpClientError } from '@/lib/httpClient'

describe('handleHttpClientError', () => {
  const toastErrorMock = vi.fn()
  beforeEach(() => {
    vi.spyOn(toast, 'error').mockImplementation(toastErrorMock)
  })

  it('should call console.error and toast.error for generic errors', () => {
    const mockError = new Error('Test Error')

    handleHttpClientError(mockError)

    expect(toastErrorMock).toHaveBeenCalledWith('An unexpected error occurred.')
  })

  it('should handle ServerErrorResponse', () => {
    const mockError = {
      isAxiosError: true,
      response: {
        data: {
          error: {
            message: 'Test error message',
          },
        },
      },
    }

    handleHttpClientError(mockError)

    expect(toastErrorMock).toHaveBeenCalledWith('Test error message')
  })

  it('should handle SmorestErrorResponse', () => {
    const mockError = {
      isAxiosError: true,
      response: {
        data: {
          code: 422,
          errors: {
            location1: {
              field1: ['Error message 1'],
            },
            location2: ['Error message 2'],
          },
          status: 'Unprocessable Entity',
        },
      },
    }

    handleHttpClientError(mockError)

    expect(toastErrorMock).toHaveBeenCalledWith('"field1" field error: Error message 1')
    expect(toastErrorMock).toHaveBeenCalledWith('Error message 2')
  })

  it('should handle axios error with no errors', () => {
    const mockError = {
      isAxiosError: true,
      response: {
        data: {
            dummy: 1
        },
      },
    }

    handleHttpClientError(mockError)

    expect(toastErrorMock).toHaveBeenCalledWith('An unexpected error occurred.')
  })
})
