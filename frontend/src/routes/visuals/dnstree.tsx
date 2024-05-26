import clsx from 'clsx'
import * as d3 from 'd3'
import { useLayoutEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'

import  httpClient from '@/lib/httpClient'
import { urlFor } from '@/lib/urlHelper'

import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'

import '../../styles/dnstree.css'

type D3Link = {
  source: Node
  target: Node
  index: number
  id: number
}

interface D3Node extends d3.SimulationNodeDatum {
  id: number
  index: number
  name: string
  size: number
  vx: number
  vy: number
  x: number
  y: number
}

interface ResponseData {
  nodes: D3Node[];
  links: D3Link[];
}

interface FLink extends d3.SimulationLinkDatum<D3Node> {}

const DnsTreePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const colors = d3.scaleOrdinal(d3.schemeCategory10)
    const radius = 5

    const width = containerRef.current!.clientWidth
    const height = window.innerHeight - remToPixels(9)

    const svg = d3.select('svg').attr('width', width).attr('height', height)

    let linkElements: d3.Selection<SVGLineElement, D3Link, SVGGElement, unknown>
    let nodeElements: d3.Selection<SVGCircleElement, D3Node, SVGGElement, unknown>
    let textElements: d3.Selection<SVGTextElement, D3Node, SVGGElement, unknown>

    const linkForce = d3
      .forceLink<D3Node, FLink>()
      .id((link) => link.id)
      .distance(parseInt(searchParams.get('distance') ?? '100'))
      .strength(1)

    const simulation = d3
      .forceSimulation()
      .force('link', linkForce)
      .force('charge', d3.forceManyBody())
      .force('center', d3.forceCenter(width / 2, height / 2))

    /* c8 ignore next 24 */
    const dragDrop = d3
      .drag<SVGCircleElement, D3Node>()
      .on('start', (event: d3.D3DragEvent<SVGCircleElement, D3Node, D3Node>) => {
        event.subject.fx = event.subject.x
        event.subject.fy = event.subject.y
      })
      .on('drag', (event: d3.D3DragEvent<SVGCircleElement, D3Node, D3Node>) => {
        simulation.alphaTarget(0.7).restart()

        event.subject.fx = event.x
        event.subject.fy = event.y
      })
      .on('end', (event: d3.D3DragEvent<SVGCircleElement, D3Node, D3Node>) => {
        if (!event.active) {
          simulation.alphaTarget(0)
        }
        event.subject.fx = null
        event.subject.fy = null
      })

    httpClient.get<ResponseData>(
      urlFor(`/backend/visuals/dnstree.json` + (searchParams.toString() ? `?${searchParams.toString()}` : '')),
    )
    .then((response) => {
      const { nodes, links } = response.data;
      update(nodes, links);
    })
    .catch((error) => {
      /* c8 ignore next 3 */
      console.error(error)
      toast.error('Error while fetching node and link data');
    });

    function update(nodes: D3Node[], links: D3Link[]) {
      linkElements = svg
        .append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('class', 'link')

      nodeElements = svg
        .append('g')
        .attr('class', 'nodes')
        .selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('class', 'node')
        .attr('data-testid', 'dns-tree-circle')
        .attr('r', (d) => {
          return Object.prototype.hasOwnProperty.call(d, 'size') ? d.size : 5
        })
        .style('fill', (_d, i) => {
          return colors(i.toString())
        })
        .call(dragDrop)
      nodeElements.append('title').text((d) => d.id)

      textElements = svg
        .append('g')
        .attr('class', 'texts')
        .selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .attr('class', 'text')
        .text(function (d) {
          return d.name
        })
        .attr('dx', 15)
        .attr('dy', 4)

      simulation.nodes(nodes).on('tick', ticked)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      simulation.force<d3.ForceLink<any, any>>('link')!.links(links)
    }

    function ticked() {
      nodeElements
        .attr('cx', (d) => {
          return (d.x = Math.max(radius, Math.min(width - radius, d.x)))
        })
        .attr('cy', (d) => {
          return (d.y = Math.max(radius, Math.min(height - radius, d.y)))
        })

      textElements
        .attr('x', (d) => {
          return d.x
        })
        .attr('y', (d) => {
          return d.y
        })

      linkElements
        .attr('x1', (d) => {
          return (d.source as unknown as D3Node).x
        })
        .attr('y1', (d) => {
          return (d.source as unknown as D3Node).y
        })
        .attr('x2', (d) => {
          return (d.target as unknown as D3Node).x
        })
        .attr('y2', (d) => {
          return (d.target as unknown as D3Node).y
        })
    }

    return () => {
      d3.select('svg').selectAll('*').remove()
    }
  }, [searchParams])

  return (
    <div>
      <Helmet>
        <title>Visuals / DNS Tree - sner4</title>
      </Helmet>
      <Heading headings={['Visuals', 'DNS Tree']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-secondary" data-toggle="collapse" data-target="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div id="dnstree_toolbar" className="dt_toolbar">
        <FilterForm url="/visuals/dnstree" />
      </div>

      <div className="text-right py-1">
        <div className="btn-group">
          <a className="btn btn-outline-secondary disabled">crop:</a>
          {['0', '1', '2'].map((crop) => (
            <a
              className={clsx(
                'btn btn-outline-secondary',
                (searchParams.get('crop') === crop && 'active') ||
                  (!searchParams.has('crop') && crop === '1' && 'active'),
              )}
              data-testid="dnstree-crop-link"
              onClick={(e) => {
                e.preventDefault()
                setSearchParams((params) => {
                  params.set('crop', crop)
                  return params
                })
              }}
              key={crop}
            >
              {crop}
            </a>
          ))}
        </div>{' '}
        <div className="btn-group">
          <a className="btn btn-outline-secondary disabled">distance:</a>
          {['100', '200'].map((distance) => (
            <a
              className={clsx(
                'btn btn-outline-secondary',
                (searchParams.get('distance') === distance && 'active') ||
                  (!searchParams.has('distance') && distance === '100' && 'active'),
              )}
              data-testid="dnstree-distance-link"
              onClick={(e) => {
                e.preventDefault()
                setSearchParams((params) => {
                  params.set('distance', distance)
                  return params
                })
              }}
              key={distance}
            >
              {distance}
            </a>
          ))}
        </div>
      </div>

      <div id="visual" ref={containerRef}>
        <svg></svg>
      </div>
    </div>
  )
}

function remToPixels(rem: number) {
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
}

export default DnsTreePage
