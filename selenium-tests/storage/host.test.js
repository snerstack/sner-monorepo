import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import { until } from 'selenium-webdriver'

import { findTableData } from '../utils/datatables.js'
import { loginUser } from '../utils/loginUser.js'
import { setupDriver } from '../utils/setupDriver.js'

describe('Host page', () => {
  let driver

  beforeEach(async () => {
    driver = await setupDriver()
    await loginUser(driver)
  })

  afterEach(async () => {
    await driver.quit()
  })

  it('views host list', async () => {
    await driver.get(process.env.FRONTEND_URL + '/storage/host/list')

    const commentCell = await driver.wait(findTableData('host_list_table', 'a some unknown service server'))

    expect(commentCell).to.exist
  })

  it('views host', async () => {
    await driver.get(process.env.FRONTEND_URL + '/storage/host/list')

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
