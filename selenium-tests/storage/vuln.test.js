import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import { until } from 'selenium-webdriver'

import { findTableData, getTableRowCount, toggleDTToolboxes, waitForTableToLoad } from '../utils/datatables.js'
import { loginUser } from '../utils/loginUser.js'
import { setupDriver } from '../utils/setupDriver.js'

describe('Vuln page', () => {
  let driver

  beforeEach(async () => {
    driver = await setupDriver()
    await loginUser(driver)
    await driver.get(process.env.FRONTEND_URL + '/storage/vuln/list')
    await waitForTableToLoad(driver, 'vuln_list_table')
  })

  afterEach(async () => {
    await driver.quit()
  })

  it('shows list of vulns', async () => {
    const commentCell = await driver.wait(
      findTableData({ driver, tableId: 'vuln_list_table', expectedData: 'a test vulnerability comment' }),
    )

    expect(commentCell).to.exist
  })

  it('shows more data', async () => {
    const showMoreButton = await driver.wait(until.elementLocated({ xpath: '//*[@title="Show more data"]' }))

    await showMoreButton.click()

    const showMoreHeadline = await driver.wait(until.elementLocated({ xpath: '//h6[text()="More data"]' }))

    expect(showMoreHeadline).to.exist
  })

  it('shows service endpoints', async () => {
    const serviceButton = await driver.wait(until.elementLocated({ xpath: '//a[text()="12345/tcp"]' }))

    await serviceButton.click()

    const serviceEndpoint = await driver.wait(until.elementLocated({ xpath: '//a[text()="tcp://127.3.3.3:12345"]' }))

    expect(serviceEndpoint).to.exist
  })

  it('selects rows', async () => {
    await toggleDTToolboxes(driver)

    const rows = await driver.wait(
      until.elementsLocated({ xpath: '//tbody/tr/td[contains(@class, "select-checkbox")]' }),
    )

    const firstRow = rows[0]

    await firstRow.click()

    let selectedRows = await driver.wait(until.elementsLocated({ xpath: '//tbody/tr[contains(@class, "selected")]' }))

    expect(selectedRows).to.have.lengthOf(1)

    const selectAllButton = await driver.wait(until.elementLocated({ xpath: '//*[@data-testid="vuln_select_all"]' }))

    await selectAllButton.click()

    selectedRows = await driver.wait(until.elementsLocated({ xpath: '//tbody/tr[contains(@class, "selected")]' }))

    expect(selectedRows).to.have.lengthOf(8)
  })

  it('edits vuln', async () => {
    const editRowButton = (await driver.wait(until.elementsLocated({ xpath: '//*[@data-testid="edit-btn"]' })))[0]

    await editRowButton.click()

    const defaultTag = await driver.wait(
      until.elementLocated({ xpath: '//*[@data-testid="default-tags"]/a[contains(text(), "Todo")]' }),
    )

    await defaultTag.click()

    const editButton = await driver.wait(until.elementLocated({ xpath: '//*[@id="Edit"]' }))

    await editButton.click()

    const firstRowTag = await driver.wait(
      until.elementLocated({ xpath: '//*[@data-testid="vuln_tags_annotate"]/span[contains(text(), "todo")]' }),
    )

    expect(firstRowTag).to.exist
  })

  it('filters vulns', async () => {
    const toggleFilterButton = await driver.findElement({ xpath: '//a[@href="#filter_form"]' })
    const filterInput = await driver.findElement({ name: 'filter' })
    const filterSubmitButton = await driver.findElement({ xpath: '//a[@data-testid="filter-btn"]' })

    await toggleFilterButton.click()
    await filterInput.sendKeys('Vuln.severity=="medium"')
    await filterSubmitButton.click()

    await waitForTableToLoad(driver, 'vuln_list_table')

    const rowCount = await getTableRowCount({ driver, tableId: 'vuln_list_table' })

    expect(rowCount).to.equal(3)
  })
})
