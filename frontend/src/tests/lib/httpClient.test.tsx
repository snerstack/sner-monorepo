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

  it('should handle axios error with message', () => {
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

  it('should handle axios error with field errors', () => {
    const mockError = {
      isAxiosError: true,
      response: {
        data: {
          error: {
            message: null,
            errors: {
              field1: ['Error message 1'],
              field2: 'Error message 2',
            },
          },
        },
      },
    }

    handleHttpClientError(mockError)

    expect(toastErrorMock).toHaveBeenCalledWith('"field1" field error: Error message 1')
    expect(toastErrorMock).toHaveBeenCalledWith('"field2" field error: Error message 2')
  })

  it('should handle axios error with no error message and no fields', () => {
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
