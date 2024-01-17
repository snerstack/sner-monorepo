import DataTable, { ConfigColumns } from 'datatables.net-bs4'
import { ReactElement } from 'react'
import { createRoot } from 'react-dom/client'

export const getTableApi = (id: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const filteredTables = DataTable.tables().filter((dt) => dt.id === id)

  return new DataTable.Api(filteredTables[0] as Node)
}

export const renderElements = (parent: Node | Element, elements: ReactElement | ReactElement[]) => {
  const root = createRoot(parent as Element)

  root.render(elements)
}

export const Column = (name: string, extra?: ConfigColumns) => {
  return {
    data: name,
    title: name,
    name: name,
    render: DataTable.render.text(),
    defaultContent: '',
    ...extra,
  }
}

export const ColumnButtons = (extra?: ConfigColumns) => {
  return {
    data: '_buttons',
    title: '_buttons',
    name: '_buttons',
    orderable: false,
    className: 'dt-nowrap',
    ...extra,
  }
}

export const ColumnSelect = (extra?: ConfigColumns) => {
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
