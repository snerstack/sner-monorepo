import DataTables, { Config } from 'datatables.net-bs4'
import 'datatables.net-select-bs4'
import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

interface TableConfig extends Config {
  id: string
  ajax: Config['ajax'] & {
    url: string
    type: string
    xhrFields: { withCredentials: boolean }
    beforeSend: (req: XMLHttpRequest) => void
  }
}

const DataTable = ({ id, ...props }: TableConfig) => {
  const tableRef = useRef<HTMLTableElement>(null)
  const [searchParams] = useSearchParams()

  const DEFAULT_CONFIG: Config = {
    serverSide: true,
    processing: true,
    dom: '<"row"<"col-sm-6"l><"col-sm-6"f>> <"row"<"col-sm-12"p>> <"row"<"col-sm-12"rt>> <"row"<"col-sm-6"i><"col-sm-6"p>>',
    info: true,
    paging: true,
    pageLength: 200,
    lengthMenu: [10, 50, 100, 200, 500, 1000],
    stateSave: true,
    columnDefs: [{ targets: 'no-sort', orderable: false }],
    order: [0, 'asc'],
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

  useEffect(() => {
    const dt = new DataTables(tableRef.current!, {
      ...DEFAULT_CONFIG,
      ...props,
    })

    return () => {
      dt.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return <table ref={tableRef} id={id} className="table table-hover table-sm" width="100%"></table>
}

export default DataTable
