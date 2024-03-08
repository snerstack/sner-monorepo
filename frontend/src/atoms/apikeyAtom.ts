import { atom } from 'recoil'

export const apikeyState = atom<string>({
  key: 'apikeyState',
  default: '',
})
