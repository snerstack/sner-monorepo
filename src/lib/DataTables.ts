import DataTable from 'datatables.net-bs4'
import { ReactElement } from 'react'
import { createRoot } from 'react-dom/client'

export const getTableApi = (id: string) => {
  const table = DataTable.tables().filter((dt) => dt.id === id)[0]

  return new DataTable.Api(table)
}

export const renderElements = (parent: HTMLElement, elements: ReactElement | ReactElement[]) => {
  const root = createRoot(parent!)

  root.render(elements)
}

export const Column = (name: string, extra?: any) => {
  return {
    data: name,
    title: name,
    name: name,
    render: DataTable.render.text(),
    defaultContent: '',
    ...extra,
  }
}

export const ColumnButtons = (extra?: any) => {
  return {
    data: '_buttons',
    title: '_buttons',
    name: '_buttons',
    orderable: false,
    className: 'dt-nowrap',
    ...extra,
  }
}

export const ColumnSelect = (extra?: any) => {
  return {
    name: '_select',
    title: '',
    data: null,
    defaultContent: '',
    orderable: false,
    className: 'select-checkbox',
    ...extra,
  }
}
