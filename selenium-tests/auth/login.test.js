import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import { Builder, Key, until } from 'selenium-webdriver'
import firefox from 'selenium-webdriver/firefox.js'

describe('Login page', () => {
  let driver

  const options = new firefox.Options()
  options.addArguments('-headless')

  beforeEach(async () => {
    driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options).build()
  })

  afterEach(async () => {
    await driver.quit()
  })

  it('visits login page', async () => {
    await driver.get('http://localhost:4173' + '/')

    const loginButton = await driver.wait(until.elementLocated({ xpath: "//a[contains(text(), 'Login')]" }))

    await loginButton.click()

    await driver.wait(until.titleIs('Login - sner4'))

    const title = await driver.getTitle()

    expect(title).to.equal('Login - sner4')
  })

  it('logs in', async () => {
    await driver.get('http://localhost:4173' + '/auth/login')

    const usernameField = await driver.wait(until.elementLocated({ name: 'username' }))
    const passwordField = await driver.wait(until.elementLocated({ name: 'password' }))
    const loginButton = await driver.wait(until.elementLocated({ xpath: '//input[@value="Login"]' }))

    await usernameField.sendKeys('testuser')
    await passwordField.sendKeys('testpass')
    await loginButton.click()

    const homepageHeadline = await driver.wait(
      until.elementsLocated({ xpath: '//h1[text()="Slow Network Recon Service"]' }),
    )

    expect(homepageHeadline).to.not.be.null
  })
})
