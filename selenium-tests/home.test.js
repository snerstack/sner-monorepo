import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import { until } from 'selenium-webdriver'

import { setupDriver } from './utils/setupDriver.js'

describe('Homepage', () => {
  let driver

  beforeEach(async () => {
    driver = await setupDriver()
  })

  afterEach(async () => {
    await driver.quit()
  })

  it('has title', async () => {
    await driver.get(process.env.FRONTEND_URL)

    await driver.wait(until.titleIs('Homepage - sner4'))

    const title = await driver.getTitle()

    expect(title).to.equal('Homepage - sner4')
  })
})
