export type AppConfig = {
    tags: {
        host: string[]
        service: string[]
        vuln: string[]
        note: string[]
        annotate: string[]
        versioninfo: string[]
        colors: {
            [tag: string]: string
        }
    },
    oidc_enabled: boolean
    oidc_display_name: string
    docs_link: string
    tos_link: string
    pdp_link: string
}

export const defaultAppConfig: AppConfig = {
    tags: {
        host: ['reviewed', 'todo'],
        service: ['reviewed', 'todo'],
        vuln: ['info', 'report', 'report:data', 'todo', 'falsepositive'],
        note: ['reviewed', 'todo'],
        annotate: ['sslhell'],
        versioninfo: ['reviewed', 'todo'],
        colors: {
            todo: '#ffc107',
            report: '#dc3545',
            'report:': '#dc3545',
        },
    },
    oidc_enabled: false,
    oidc_display_name: 'Federated login',
    docs_link: 'https://github.com/snerstack',
    tos_link: '#',
    pdp_link: '#',
}
