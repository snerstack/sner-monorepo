import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import { By, until } from 'selenium-webdriver'

import { findTableData, toggleDTToolboxes } from '../utils/datatables.js'
import { loginUser } from '../utils/loginUser.js'
import { setupDriver } from '../utils/setupDriver.js'

describe('Host page', () => {
  let driver

  beforeEach(async () => {
    driver = await setupDriver()
    await loginUser(driver)
    await driver.get(process.env.FRONTEND_URL + '/storage/host/list')
  })

  afterEach(async () => {
    await driver.quit()
  })

  it('shows list of hosts', async () => {
    const commentCell = await driver.wait(findTableData('host_list_table', 'a some unknown service server'))

    expect(commentCell).to.exist
  })

  it('shows more data', async () => {
    const showMoreButton = await driver.wait(until.elementLocated({ xpath: '//*[@title="Show more data"]' }))

    await showMoreButton.click()

    const showMoreHeadline = await driver.wait(until.elementLocated({ xpath: '//h6[text()="More data"]' }))

    expect(showMoreHeadline).to.exist
  })

  it('toggle datatables toolbox', async () => {
    await toggleDTToolboxes(driver)

    const toolbox = await driver.wait(until.elementLocated({ id: 'host_list_table_toolbox' }))

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

    const selectAllButton = await driver.wait(until.elementLocated({ xpath: '//*[@data-testid="host_select_all"]' }))

    await selectAllButton.click()

    selectedRows = await driver.wait(until.elementsLocated({ xpath: '//tbody/tr[contains(@class, "selected")]' }))

    expect(selectedRows).to.have.lengthOf(2)
  })

  it('views host', async () => {
    const hostLink = await driver.wait(findTableData('host_list_table', '127.4.4.4'))

    await hostLink.click()

    const hostname = await driver.wait(
      until.elementLocated({ xpath: '//li[contains(text(), "testhost.testdomain.test<script>alert(1);</script>")]' }),
    )

    expect(hostname).to.exist

    const vulnsTab = await driver.wait(until.elementLocated({ xpath: '//*[@data-testid="vulns_tab"]' }))

    await vulnsTab.click()

    const vuln = await driver.wait(findTableData('host_view_vuln_table', 'aggregable vuln'))

    expect(vuln).to.exist
  })
})
