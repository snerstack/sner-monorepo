import { expect } from 'chai'
import { afterEach, beforeEach, describe, it } from 'mocha'
import { Builder, until } from 'selenium-webdriver'
import { Options } from 'selenium-webdriver/firefox.js'

describe('Homepage', () => {
  let driver

  const options = new Options()
  options.addArguments('-headless')

  beforeEach(async () => {
    driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options).build()
  })

  afterEach(async () => {
    await driver.quit()
  })

  it('has title', async () => {
    await driver.get('http://localhost:4173')

    await driver.wait(until.titleIs('Homepage - sner4'))

    const title = await driver.getTitle()

    expect(title).to.equal('Homepage - sner4')
  })
})
