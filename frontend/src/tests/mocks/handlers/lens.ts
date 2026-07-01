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

const overview_data = {
    objects: {
        hosts: 11,
        services: 22,
        vulnerabilities: 33,
    },
    vuln_severities: {
        critical: 1,
        high: 2,
        medium: 3,
        low: 4,
        info: 5,
        // intentionaly omitted for test edge-case
        //unknown: 6,
    },
    allowed_networks: ["127.0.0.1/32", "127.0.0.2/32", "127.0.0.2/32", "::2/128", "::1/128"],
}

export const lensHandlers = [
    http.get("/backend/lens/overview.json", () => {
        return HttpResponse.json(overview_data)
    }),

    http.post("/backend/lens/host/list.json", () => {
        return HttpResponse.json(hosts_data)
    }),

    http.post('/backend/lens/service/list.json', () => {
        return HttpResponse.json(services_data)
    }),

    http.post('/backend/lens/vuln/list.json', () => {
        return HttpResponse.json(vulns_data)
    }),
]
