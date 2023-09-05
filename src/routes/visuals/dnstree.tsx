/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/no-unsafe-return */
import env from 'app-env'
import clsx from 'clsx'
import * as d3 from 'd3'
import { useLayoutEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'

import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'

import '../../styles/dnstree.css'

type D3Node = {
  id: number
  index: number
  name: string
  size: number
  vx: number
  vy: number
  x: number
  y: number
}

type D3Link = {
  source: Node
  target: Node
  index: number
}

const DnsTreePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!searchParams.has('distance')) {
      setSearchParams((params) => {
        params.set('distance', '100')
        return params
      })
    }

    if (!searchParams.has('crop')) {
      setSearchParams((params) => {
        params.set('crop', '1')
        return params
      })
    }

    const colors = d3.scaleOrdinal(d3.schemeCategory10)
    const radius = 5

    const width = containerRef.current!.clientWidth
    const height = window.innerHeight - remToPixels(9)

    const svg = d3.select('svg').attr('width', width).attr('height', height)

    let linkElements: d3.Selection<SVGLineElement, D3Link, SVGGElement, unknown>
    let nodeElements: d3.Selection<SVGCircleElement, D3Node, SVGGElement, unknown> & string
    let textElements: d3.Selection<SVGTextElement, D3Node, SVGGElement, unknown>

    const linkForce = d3
      .forceLink()
      .id((link) => link.id)
      .distance(parseInt(searchParams.get('distance')!))
      .strength(1)

    const simulation = d3
      .forceSimulation()
      .force('link', linkForce)
      .force('charge', d3.forceManyBody())
      .force('center', d3.forceCenter(width / 2, height / 2))

    const dragDrop = d3
      .drag()
      .on('start', (node) => {
        node.fx = node.x
        node.fy = node.y
      })
      .on('drag', (node) => {
        simulation.alphaTarget(0.7).restart()
        node.fx = d3.event.x
        node.fy = d3.event.y
      })
      .on('end', (node) => {
        if (!d3.event.active) {
          simulation.alphaTarget(0)
        }
        node.fx = null
        node.fy = null
      })

    d3.json(
      env.VITE_SERVER_URL +
        `/visuals/dnstree.json?crop=${searchParams.get('crop')}&distance=${searchParams.get('distance')}`,
      { credentials: 'include' },
    )
      .then((data) => {
        const { nodes, links } = data as {
          nodes: D3Node[]
          links: D3Link[]
        }

        update(nodes, links)
      })
      .catch(() => toast.error('Error while fetching node and link data'))

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
        .attr('r', (d) => {
          return Object.prototype.hasOwnProperty.call(d, 'size') ? d.size : 5
        })
        .style('fill', (_d, i) => {
          return colors(i)
        })
        .call(dragDrop)
      nodeElements.append('title').text(function (d) {
        return d.id
      })

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
      simulation.force('link').links(links)
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
          return d.source.x
        })
        .attr('y1', (d) => {
          return d.source.y
        })
        .attr('x2', (d) => {
          return d.target.x
        })
        .attr('y2', (d) => {
          return d.target.y
        })
    }

    return () => {
      d3.select('svg').selectAll('*').remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <div>
      <Heading headings={['Visuals', 'DNS Tree']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-secondary" data-toggle="collapse" href="#filter_form">
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
              className={clsx('btn btn-outline-secondary', searchParams.get('crop') === crop && 'active')}
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
              className={clsx('btn btn-outline-secondary', searchParams.get('distance') === distance && 'active')}
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

function remToPixels(rem) {
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
}

export default DnsTreePage
