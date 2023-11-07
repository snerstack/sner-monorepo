import { until } from 'selenium-webdriver'

export function findTableData(tableId, expectedData) {
  return until.elementLocated({ xpath: `//table[@id="${tableId}"]/tbody/tr/td/*[text()="${expectedData}"]` })
}
