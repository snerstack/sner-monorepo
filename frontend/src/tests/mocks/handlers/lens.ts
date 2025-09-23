import { http, HttpResponse } from 'msw'

const hosts_data = {
    draw: "1",
    recordsTotal: "1",
    recordsFiltered: "1",
    data: [
        {
            "id": 1,
            "address": "127.3.5.6",
            "hostname": "lens.hostname.test <XSS>",
            "services": 1,
            "vulns": 1,
            "tags": ["dummy test tag"]
        }
    ]
}

const services_data = {
    draw: "1",
    recordsTotal: "1",
    recordsFiltered: "1",
    data: [
      {
        "id": 33,
        "host_id": hosts_data.data[0].id,
        "host_address": hosts_data.data[0].address,
        "host_hostname": hosts_data.data[0].hostname,
        "proto": "tcp",
        "port": 133,
        "name": "dummyportname",
        "state": "open:lenstest",
        "info": "dummy service info",
        "tags": [],
      }
    ]
  }

const vulns_data = {
    draw: "1",
    recordsTotal: "1",
    recordsFiltered: "1",
    data: [
        {
            "id": 44,
            "host_id": hosts_data.data[0].id,
            "host_address": hosts_data.data[0].address,
            "host_hostname": hosts_data.data[0].hostname,
            "service_proto": services_data.data[0].proto,
            "service_port": services_data.data[0].port,
            "service": `${services_data.data[0].proto}/${services_data.data[0].port}`,
            "via_target": hosts_data.data[0].address,
            "name": "dummy vuln name",
            "xtype": "xtype.dummy",
            "severity": "low",
            "refs": [],
            "tags": [],
        }
    ]
}

const versioninfos_data = {
    draw: "1",
    recordsTotal: "1",
    recordsFiltered: "1",
    data: [
        {
            "id": 55,
            "host_id": hosts_data.data[0].id,
            "host_address": hosts_data.data[0].address,
            "host_hostname": hosts_data.data[0].hostname,
            "service_proto": services_data.data[0].proto,
            "service_port": services_data.data[0].port,
            "service": `${services_data.data[0].proto}/${services_data.data[0].port}`,
            "via_target": hosts_data.data[0].address,
            "product": "dummy product",
            "version": "1.2.3",
            "extra": '{}',
            "tags": [],
        },
        {
            "id": 56,
            "host_id": hosts_data.data[0].id,
            "host_address": hosts_data.data[0].address,
            "host_hostname": hosts_data.data[0].hostname,
            "service_proto": services_data.data[0].proto,
            "service_port": services_data.data[0].port,
            "service": `${services_data.data[0].proto}/${services_data.data[0].port}`,
            "via_target": hosts_data.data[0].address,
            "product": "dummy product 2",
            "version": "4.5.6",
            "extra": '{}',
            "tags": [],
        }
    ]
}

export const lensHandlers = [
    http.post("/backend/lens/host/list.json", () => {
        return HttpResponse.json(hosts_data)
    }),

    http.post('/backend/lens/service/list.json', () => {
        return HttpResponse.json(services_data)
    }),

    http.post('/backend/lens/vuln/list.json', () => {
        return HttpResponse.json(vulns_data)
    }),

    http.post('/backend/lens/versioninfo/list.json', ({ request }) => {
        const url = new URL(request.url)
        const product = url.searchParams.get('product')
        const versionspec = url.searchParams.get('versionspec')

        if (product === 'dummy product' && versionspec === '>=2.0.0') {
            return HttpResponse.json({
                draw: '1',
                recordsTotal: '1',
                recordsFiltered: '1',
                data: [versioninfos_data.data[1]],
            })
        }

        return HttpResponse.json(versioninfos_data)
    }),
]
