import DataTables, { Config } from 'datatables.net-bs4'
import 'datatables.net-select-bs4'
import { useCookie } from 'react-use'
import { useEffect, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

import { observeElements } from '@/lib/DataTables'
import { csrfTokenHeaderName } from '@/lib/httpClient'
import { toast } from 'react-toastify'

type OrderArray = [number, 'asc' | 'desc']

interface TableConfig extends Config {
  id?: string
  ajax_url?: string
  order?: OrderArray[]
}

interface Column {
  name: string
}

const DataTable = ({ id, ...props }: TableConfig) => {
  const tableRef = useRef<HTMLTableElement>(null)
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [csrfToken] = useCookie('tokencsrf')

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

  /**
   * adds ID column sorting (initial setup)
   */
  const addSortingProps = (tableProps: TableConfig): TableConfig => {
    const idColumnIndex = findIdColumnIndex(tableProps.columns as Column[])

    if (idColumnIndex === -1) {
      return { ...tableProps }
    }

    const existingOrder = tableProps.order ?? []
    return {
      ...tableProps,
      order: [...existingOrder, [idColumnIndex, 'asc']],
    }
  }

  /**
   * add request type and csrf handling if called with ajax_url prop
   */
  const makeAjax = (tableProps: TableConfig): TableConfig => {
    /* c8 ignore next 3 */
    if (!('ajax_url' in tableProps)) {
      return { ...tableProps }
    }

    const { ajax_url, ...rest } = tableProps
    return {
      ...rest,
      ajax: {
        url: ajax_url,
        type: "POST",
        xhrFields: { withCredentials: true },
        beforeSend: (req) => req.setRequestHeader(csrfTokenHeaderName, csrfToken!),
        /* c8 ignore next 5 */
        error: (err: JQuery.jqXHR) => {
          console.log(ajax_url)
          console.error("DT ajax error", err)
          toast.error(`DT ajax error, ${(err.responseJSON as BackendErrorResponse)?.error?.message ?? err.statusText}`)
        }
      }
    }
  }

  /**
   * adds ID column sorting (on every request)
   */
  const sortingXhrHandler = (_event: object, settings: DataTables.Settings, data: DataTables.AjaxDataRequest): void => {
    const idColumnIndex = findIdColumnIndex((settings as { aoColumns: Column[] }).aoColumns)
    if (idColumnIndex !== -1) {
      data.order.push({ column: idColumnIndex, dir: 'asc' })
    }
  }

  useEffect(() => {
    let tableProps = { ...DEFAULT_CONFIG, ...props }
    tableProps = makeAjax(tableProps)
    tableProps = addSortingProps(tableProps)

    const dt = new DataTables(tableRef.current!, tableProps)
    dt.on('preXhr.dt', sortingXhrHandler)

    observeElements()

    return () => {
      dt.destroy()
    }

    /**
     * Dependencies:
     * - searchParams: triggers table reload on filter change
     * - location: for tabbed views in host page
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, location])

  return <table ref={tableRef} id={id} className="table table-hover table-sm" width="100%"></table>
}

export default DataTable
