interface ImportMetaEnv {
  readonly VITE_HOST_TAGS: string
  readonly VITE_SERVICE_TAGS: string
  readonly VITE_VULN_TAGS: string
  readonly VITE_NOTE_TAGS: string
  readonly VITE_ANNOTATE_TAGS: string
  readonly VITE_VERSIONINFO_TAGS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
