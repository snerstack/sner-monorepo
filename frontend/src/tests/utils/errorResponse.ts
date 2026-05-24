/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { AxiosError, AxiosResponse } from 'axios'

export const errorResponse = (data: any) => {
  const error = new AxiosError()
  error.response = { data: { error: data } } as AxiosResponse<any>

  return error
}

export const smorestErrorResponse = (data: SmorestErrorResponse): AxiosError<SmorestErrorResponse> => {
  const error = new AxiosError<SmorestErrorResponse>()
  
  error.response = { 
    data: data,
    status: data.code,
    statusText: data.status,
  } as AxiosResponse<SmorestErrorResponse>

  return error
}