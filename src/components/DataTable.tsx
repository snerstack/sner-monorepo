import DataTables, { Config } from 'datatables.net-bs4'
import 'datatables.net-select-bs4'
import { useEffect, useRef } from 'react'
import axios from 'axios'
import { useSearchParams } from 'react-router-dom'

const DataTable = ({ id, ...props }: Config) => {
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
    stateSaveCallback: function (settings: any, data) {
      sessionStorage.setItem(
        'DataTables_' + settings.sInstance + '_' + window.location.pathname + '_' + window.location.search,
        JSON.stringify(data),
      )
    },
    stateLoadCallback: function (settings: any) {
      return JSON.parse(
        sessionStorage.getItem('DataTables_' + settings.sInstance + '_' + location.pathname + '_' + location.search),
      )
    },
  }

  useEffect(() => {
    const dt = new DataTables(tableRef.current!, {
      ...DEFAULT_CONFIG,
      ...props,
      drawCallback: () => {
        const deleteBtns = tableRef.current?.querySelectorAll('td a.abutton_submit_dataurl_delete')

        deleteBtns?.forEach((btn) => {
          btn.addEventListener('click', (e) => {
            const url = (e!.target as HTMLElement)!.closest('a')!.getAttribute('data-url')
            axios.post('http://localhost:18000' + url)

            dt.draw()
          })
        })
      },
    })

    return () => {
      dt.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return <table ref={tableRef} id={id} className="table table-hover table-sm" width="100%"></table>
}

export default DataTable
