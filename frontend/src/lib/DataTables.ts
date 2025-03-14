/*
 * Integration of React with DataTables.net
 *
 * roots, renderElements, observerElements and cleanupElements provides facilities
 * for integrating React with DataTables.net, where both libraries manage the DOM.
 * To coexist, React renders only the TABLE element managed further by DataTables.net,
 * but the table cells are again React components. The cell elements are registered
 * in roots, cleaned by MutationObserver if required, but directly cleaned up in tests.
 */

import DataTable, { ConfigColumns } from 'datatables.net-bs4'
import { ReactElement } from 'react'
import { Root, createRoot } from 'react-dom/client'

export const getTableApi = (id: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const filteredTables = DataTable.tables().filter((dt) => dt.id === id)
  return new DataTable.Api(filteredTables[0] as Node)
}

let roots: { root: Root; element: Element }[] = []

export const renderElements = (parent: Node | Element, elements: ReactElement | ReactElement[]) => {
  const root = createRoot(parent as Element)
  root.render(elements)

  roots.push({ root: root, element: parent as Element })
}

export const observeElements = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(() => {
      roots = roots.filter(({ root, element }) => {
        if (!document.contains(element)) {
          root.unmount()
          return false
        }
        return true
      })
    })
  })

  observer.observe(document.body, { subtree: true, childList: true })
}

// called from vitest to cleanup VDOM before generic cleanup in afterEach block
export const cleanupElements = () => {
  roots.forEach((item) => item.root.unmount())
  roots.length = 0
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
