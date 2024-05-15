export const config = {
  tags: {
    host: ['reviewed', 'todo'],
    service: ['reviewed', 'todo'],
    vuln: ['info', 'report', 'report:data', 'todo', 'falsepositive'],
    note: ['reviewed', 'todo'],
    annotate: ['sslhell'],
    versioninfo: ['reviewed', 'todo'],
    vulnsearch: ['reviewed', 'todo'],
    colors: {
      todo: '#ffc107',
      report: '#dc3545',
      "report:": '#dc3545',
    },
  },
} as Config

export type Config = {
  tags: {
    host: string[]
    service: string[]
    vuln: string[]
    note: string[]
    annotate: string[]
    versioninfo: string[]
    vulnsearch: string[]
    colors: {
      [tag: string]: string
    }
  }
}

export default config
