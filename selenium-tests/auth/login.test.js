import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import { until } from 'selenium-webdriver'

import { loginUser } from '../utils/loginUser.js'
import { setupDriver } from '../utils/setupDriver.js'

describe('Login page', () => {
  let driver

  beforeEach(async () => {
    driver = await setupDriver()
  })

  afterEach(async () => {
    await driver.quit()
  })

  it('visits login page', async () => {
    await driver.get(process.env.FRONTEND_URL + '/')

    const loginButton = await driver.wait(until.elementLocated({ xpath: "//a[contains(text(), 'Login')]" }))

    await loginButton.click()

    await driver.wait(until.titleIs('Login - sner4'))

    const title = await driver.getTitle()

    expect(title).to.equal('Login - sner4')
  })

  it('logs in', async () => {
    loginUser(driver)

    const homepageHeadline = await driver.wait(
      until.elementsLocated({ xpath: '//h1[text()="Slow Network Recon Service"]' }),
    )

    expect(homepageHeadline).to.not.be.null
  })
})
