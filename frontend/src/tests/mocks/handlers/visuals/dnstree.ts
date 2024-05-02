import { rest } from 'msw'

const data = {
  links: [
    {
      source: 0,
      target: 1,
    },
    {
      source: 1,
      target: 2,
    },
    {
      source: 0,
      target: 3,
    },
    {
      source: 0,
      target: 4,
    },
    {
      source: 4,
      target: 5,
    },
  ],
  nodes: [
    {
      id: 0,
      name: 'DOTROOT',
      size: 10,
    },
    {
      id: 1,
      name: 'test<script>alert(1);</script>',
    },
    {
      id: 2,
      name: 'testdomain',
    },
    {
      id: 3,
      name: 'localhost',
    },
    {
      id: 4,
      name: 'test',
    },
    {
      id: 5,
      name: 'testdomain',
    },
  ],
}

export const dnsTreeHandler = rest.get('/backend/visuals/dnstree.json', (_, res, ctx) => {
  return res(ctx.json(data))
})
