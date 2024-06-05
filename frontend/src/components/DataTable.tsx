import DataTables, { AjaxData, Api, Config } from 'datatables.net-bs4'
import 'datatables.net-select-bs4'
import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

import { observeElements } from '@/lib/DataTables'

type OrderArray = [number, 'asc' | 'desc']

interface TableConfig extends Config {
  id?: string
  order?: OrderArray[]
}

interface Column {
  name: string
}

const DataTable = ({ id, ...props }: TableConfig) => {
  const tableRef = useRef<HTMLTableElement>(null)
  const [searchParams] = useSearchParams()

  const DEFAULT_CONFIG: TableConfig = {
    autoWidth: false,
    serverSide: true,
    processing: true,
    dom: '<"row"<"col-sm-6"l><"col-sm-6"f>> <"row"<"col-sm-12"p>> <"row"<"col-sm-12"rt>> <"row"<"col-sm-6"i><"col-sm-6"p>>',
    info: true,
    paging: true,
    pageLength: 200,
    lengthMenu: [10, 50, 100, 200, 500, 1000, 5000],
    stateSave: true,
    columnDefs: [{ targets: 'no-sort', orderable: false }],
    preDrawCallback: function (settings) {
      const api = new DataTables.Api(settings)
      const paginationElements = document.querySelectorAll<HTMLElement>(`#${id}_wrapper .dataTables_paginate`)

      if (paginationElements.length === 0) return // in case pagination is already disabled

      paginationElements.forEach((element) => {
        if (api.page.info().pages > 1) {
          element.style.display = 'block'
        } else {
          element.style.display = 'none'
        }
      })
    },

    stateSaveCallback: function (settings, data) {
      sessionStorage.setItem(
        'DataTables_' +
          (settings as { sInstance: string }).sInstance +
          '_' +
          window.location.pathname +
          '_' +
          window.location.search,
        JSON.stringify(data),
      )
    },
    stateLoadCallback: function (settings) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return JSON.parse(
        sessionStorage.getItem(
          'DataTables_' +
            (settings as { sInstance: string }).sInstance +
            '_' +
            location.pathname +
            '_' +
            location.search,
        ) ?? '{}',
      )
    },
  }

  const findIdColumnIndex = (columns: Column[]): number => {
    return columns.findIndex(column => column.name === 'id')
  }

  // adds ID column sorting (initial setup)
  const addSortingProps = (tableProps: TableConfig): void => {
    const idColumnIndex = findIdColumnIndex(tableProps.columns as Column[])
    if (idColumnIndex !== -1) {
      tableProps.order = tableProps.order || []
      tableProps.order.push([idColumnIndex, 'asc']);
    }
  }

  // adds ID column sorting (on every request)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addSortingXhr = (dt: Api<any>): void => {
    dt.on('preXhr.dt', (_event, settings, data: AjaxData) => {
      const idColumnIndex = findIdColumnIndex((settings as {aoColumns: Column[]}).aoColumns)
      if (idColumnIndex !== -1) {
        data.order.push({ 'column': idColumnIndex, 'dir': 'asc' })
      }
    })
  }

  useEffect(() => {
    const tableProps = { ...DEFAULT_CONFIG, ...props }
    addSortingProps(tableProps)
    const dt = new DataTables(tableRef.current!, tableProps)
    addSortingXhr(dt)

    observeElements()

    return () => {
      dt.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return <table ref={tableRef} id={id} className="table table-hover table-sm" width="100%"></table>
}

export default DataTable
