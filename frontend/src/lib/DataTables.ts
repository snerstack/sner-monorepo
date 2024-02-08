import DataTable, { ConfigColumns } from 'datatables.net-bs4'
import { ReactElement } from 'react'
import { Root, createRoot } from 'react-dom/client'

export const getTableApi = (id: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const filteredTables = DataTable.tables().filter((dt) => dt.id === id)

  return new DataTable.Api(filteredTables[0] as Node)
}

const roots: { root: Root; element: Element }[] = []

export const renderElements = (parent: Node | Element, elements: ReactElement | ReactElement[]) => {
  const root = createRoot(parent as Element)
  root.render(elements)

  roots.push({ root: root, element: parent as Element })
}

export const observeElements = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(() => {
      roots.forEach(({ root, element }, index) => {
        // if the element is not in DOM, unmount the root from virtual DOM
        if (!document.contains(element)) {
          root.unmount()
          roots.splice(index, 1)
        }
      })
    })
  })

  observer.observe(document.body, { subtree: true, childList: true })
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
