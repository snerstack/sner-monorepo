import { create } from 'zustand'

export const useTagConfig = create<{ tagConfig: TagConfig; setTagConfig: (cfg: TagConfig) => void }>((set) => ({
  tagConfig: {
    tag: '',
    color: '',
    show: false,
  },
  setTagConfig: (tagConfig) => set({ tagConfig }),
}))
