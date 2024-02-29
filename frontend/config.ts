const config = {
  tags: {
    host: ['reviewed', 'todo'],
    service: ['reviewed', 'todo'],
    vuln: ['info', 'report', 'report:data', 'todo', 'falsepositive'],
    note: ['reviewed', 'todo'],
    annotate: ['sslhell'],
    versioninfo: ['reviewed', 'todo'],
    vulnsearch: ['reviewed', 'todo'],
    colors: {
      tags: {
        todo: '#ffc107',
        report: '#dc3545',
      },
      prefixes: {
        report: '#dc3545',
        i: '#6c757d',
      },
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
      tags: {
        [tag: string]: string
      }
      prefixes: {
        [prefix: string]: string
      }
    }
  }
}

export default config
