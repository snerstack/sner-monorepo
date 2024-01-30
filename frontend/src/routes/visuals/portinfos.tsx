import clsx from 'clsx'
import * as d3 from 'd3'
import d3Cloud from 'd3-cloud'
import { useLayoutEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'

import FilterForm from '@/components/FilterForm'
import Heading from '@/components/Heading'

const PortinfosPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    // graph
    const colors = d3.scaleOrdinal(d3.schemeCategory10)
    const width = containerRef.current!.clientWidth
    const height = 0.77 * window.innerHeight
    const svg = d3.select('svg').attr('width', width).attr('height', height)
    svg
      .append('g')
      .attr('class', 'wordcloud')
      .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')')
    svg
      .append('g')
      .attr('class', 'processing')
      .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')')
      .append('text')
      .style('font-size', '20px')
      .style('text-anchor', 'middle')
      .text('Processing graph ...')

    // generate graph layout
    d3.json(
      import.meta.env.VITE_SERVER_URL +
        `/visuals/portinfos.json?${searchParams.toString() ? `?${searchParams.toString()}` : ''}`,
      { credentials: 'include' },
    )
      .then((data) => {
        const counts = (data as { count: number }[]).map((item) => item.count)
        const max = Math.max.apply(null, counts)
        const min = Math.min.apply(null, counts)
        const fontSize = d3
          .scaleLog()
          .domain(searchParams.get('view') === 'inverse' ? [max, min] : [min, max])
          .range([10, 40])

        d3Cloud()
          .size([width, height])
          .timeInterval(20)
          .words(data as d3Cloud.Word[])
          .rotate(0)
          .fontSize((item) => fontSize(item.size ?? 10))
          .text((item) => (item as { info: string }).info)
          .on('end', (data) => draw(data))
          .start()
      })
      .catch(() => toast.error('Error while fetching data'))

    function draw(words: d3Cloud.Word[]) {
      d3.select('.wordcloud')
        .selectAll('text')
        .data(words)
        .enter()
        .append('text')
        .attr('class', 'word')
        .style('fill', (_item, i: number) => colors(i.toString()))
        .style('font-size', (item) => item.size + 'px')
        .style('font-family', (item) => item.font ?? '')
        .attr('text-anchor', 'middle')
        .attr('transform', (item) => `translate(${item.x}, ${item.y}) rotate(${item.rotate})`)
        .text((item) => item.text ?? '')

      d3.select('.processing').style('visibility', 'hidden')
    }

    return () => {
      d3.select('svg').selectAll('*').remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div>
      <Helmet>
        <title>Visuals / Port infos - sner4</title>
      </Helmet>
      <Heading headings={['Visuals', 'Port infos']}>
        <div className="breadcrumb-buttons pl-2">
          <a className="btn btn-outline-secondary" data-toggle="collapse" href="#filter_form">
            <i className="fas fa-filter"></i>
          </a>
        </div>
      </Heading>

      <div className="text-right py-1">
        <div className="btn-group">
          <a className="btn btn-outline-secondary disabled">view:</a>
          <>
            {['normal', 'inverse'].map((view) => (
              <a
                className={clsx('btn btn-outline-secondary', searchParams.get('view') === view && 'active')}
                onClick={(e) => {
                  e.preventDefault()
                  setSearchParams((params) => {
                    params.set('view', view)
                    return params
                  })
                }}
                key={view}
              >
                {view}
              </a>
            ))}
          </>
        </div>{' '}
        <div className="btn-group">
          <a className="btn btn-outline-secondary disabled">crop:</a>
          <>
            {['2', '3', '4', '5'].map((crop) => (
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

            <a
              className={clsx('btn btn-outline-secondary', !searchParams.has('crop') && 'active')}
              onClick={(e) => {
                e.preventDefault()
                setSearchParams((params) => {
                  params.delete('crop')

                  return params
                })
              }}
            >
              no crop
            </a>
          </>
        </div>{' '}
        <div className="btn-group">
          <a className="btn btn-outline-secondary disabled">limit:</a>
          <>
            {['10', '30', '40', '50', '100', '200'].map((limit) => (
              <a
                className={clsx('btn btn-outline-secondary', searchParams.get('limit') === limit && 'active')}
                onClick={(e) => {
                  e.preventDefault()
                  setSearchParams((params) => {
                    params.set('limit', limit)
                    return params
                  })
                }}
                key={limit}
              >
                {limit}
              </a>
            ))}
            <a
              className={clsx('btn btn-outline-secondary', !searchParams.has('limit') && 'active')}
              onClick={(e) => {
                e.preventDefault()
                setSearchParams((params) => {
                  params.delete('limit')
                  return params
                })
              }}
            >
              no limit
            </a>
          </>
        </div>
        <FilterForm url="/visuals/portinfos" />
      </div>

      <div id="visual" ref={containerRef}>
        <svg></svg>
      </div>
    </div>
  )
}
export default PortinfosPage
