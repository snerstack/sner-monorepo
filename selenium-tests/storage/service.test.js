import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import { until } from 'selenium-webdriver'

import { findTableData, toggleDTToolboxes } from '../utils/datatables.js'
import { loginUser } from '../utils/loginUser.js'
import { setupDriver } from '../utils/setupDriver.js'

describe('Service page', () => {
  let driver

  beforeEach(async () => {
    driver = await setupDriver()
    await loginUser(driver)
    await driver.get(process.env.FRONTEND_URL + '/storage/service/list')
  })

  afterEach(async () => {
    await driver.quit()
  })

  it('shows list of services', async () => {
    const commentCell = await driver.wait(findTableData('service_list_table', 'manual testservice comment'))

    expect(commentCell).to.exist
  })

  it('shows more data', async () => {
    const showMoreButton = await driver.wait(until.elementLocated({ xpath: '//*[@title="Show more data"]' }))

    await showMoreButton.click()

    const showMoreHeadline = await driver.wait(until.elementLocated({ xpath: '//h6[text()="More data"]' }))

    expect(showMoreHeadline).to.exist
  })

  it('toggles datatables toolbox', async () => {
    await toggleDTToolboxes(driver)

    const toolbox = await driver.wait(until.elementLocated({ id: 'service_list_table_toolbox' }))

    expect(await toolbox.isDisplayed()).to.be.true
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

    const selectAllButton = await driver.wait(until.elementLocated({ xpath: '//*[@data-testid="service_select_all"]' }))

    await selectAllButton.click()

    selectedRows = await driver.wait(until.elementsLocated({ xpath: '//tbody/tr[contains(@class, "selected")]' }))

    expect(selectedRows).to.have.lengthOf(2)
  })

  it('edits service', async () => {
    const editRowButton = (await driver.wait(until.elementsLocated({ xpath: '//*[@data-testid="edit-btn"]' })))[0]

    await editRowButton.click()

    const defaultTag = await driver.wait(
      until.elementLocated({ xpath: '//*[@data-testid="default-tags"]/a[contains(text(), "Todo")]' }),
    )

    await defaultTag.click()

    const editButton = await driver.wait(until.elementLocated({ xpath: '//*[@id="Edit"]' }))

    await editButton.click()

    const firstRowTag = await driver.wait(
      until.elementLocated({ xpath: '//*[@data-testid="service_tags_annotate"]/span[contains(text(), "todo")]' }),
    )

    expect(firstRowTag).to.exist
  })
})
