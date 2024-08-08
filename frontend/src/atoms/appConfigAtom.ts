import { atom } from 'recoil'

import { AppConfig, defaultAppConfig } from '@/appConfig'

export const appConfigState = atom<AppConfig>({
    key: 'appConfig',
    default: defaultAppConfig,
})
