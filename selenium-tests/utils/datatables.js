import { By, until } from 'selenium-webdriver'

export function findTableData(tableId, expectedData) {
  return until.elementLocated({ xpath: `//table[@id="${tableId}"]/tbody/tr/td/*[text()="${expectedData}"]` })
}

export async function toggleDTToolboxes(driver) {
  const userNav = await driver.wait(until.elementLocated({ id: 'dropdownUser' }))
  await userNav.click()

  const toggleDTToolboxesButton = await driver.wait(
    until.elementLocated({ xpath: '//a[contains(text(), "Toggle DT toolboxes")]' }),
  )

  await toggleDTToolboxesButton.click()
}
