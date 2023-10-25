import { atom } from 'recoil'

export const apikeyModalState = atom<{ show: boolean; apikey: string }>({
  key: 'apikeyModalState',
  default: { show: false, apikey: '' },
})
