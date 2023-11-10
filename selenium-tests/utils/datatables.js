import { By, until } from 'selenium-webdriver'

export async function waitForTableToLoad(driver, tableId) {
  const table = await driver.wait(until.elementLocated(By.id(`${tableId}_processing`)))

  await driver.wait(until.elementIsNotVisible(table))
}

export async function findTableData({ driver, tableId, expectedData }) {
  return await driver.findElement({ xpath: `//table[@id="${tableId}"]/tbody/tr/td/*[text()="${expectedData}"]` })
}

export async function getTableRowCount({ driver, tableId }) {
  return (await driver.findElements({ xpath: `//table[@id="${tableId}"]/tbody/tr` })).length
}

export async function toggleDTToolboxes(driver) {
  const userNav = await driver.wait(until.elementLocated({ id: 'dropdownUser' }))
  await userNav.click()

  const toggleDTToolboxesButton = await driver.wait(
    until.elementLocated({ xpath: '//a[contains(text(), "Toggle DT toolboxes")]' }),
  )

  await toggleDTToolboxesButton.click()
}
