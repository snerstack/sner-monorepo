/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { AxiosError, AxiosResponse } from 'axios'

export const errorResponse = (data: any) => {
  const error = new AxiosError()
  error.response = { data: { error: data } } as AxiosResponse<any>

  return error
}
