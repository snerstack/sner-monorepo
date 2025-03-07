import { vi, expect, it, describe, beforeEach } from 'vitest'
import { toast } from 'react-toastify'
import { handleHttpClientError } from '@/lib/httpClient'

describe('handleHttpClientError', () => {
  const consoleErrorMock = vi.fn()
  const toastErrorMock = vi.fn()

  beforeEach(() => {
    vi.spyOn(toast, 'error').mockImplementation(toastErrorMock)
    // not used in each test directly, but also silences errors on console during testing
    vi.spyOn(console, 'error').mockImplementation(consoleErrorMock)
  })

  it('should call console.error and toast.error for generic errors', () => {
    const mockError = new Error('Test Error')

    handleHttpClientError('Test Description', mockError)

    expect(consoleErrorMock).toHaveBeenCalledWith('Test Description', mockError)
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

    handleHttpClientError('Test Description', mockError)

    expect(toastErrorMock).toHaveBeenCalledWith('Test Description, Test error message')
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

    handleHttpClientError('Test Description', mockError)

    expect(toastErrorMock).toHaveBeenCalledWith('field1: Error message 1')
    expect(toastErrorMock).toHaveBeenCalledWith('field2: Error message 2')
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

    handleHttpClientError('Test Description', mockError)

    expect(toastErrorMock).toHaveBeenCalledWith('An unexpected error occurred.')
  })
})
