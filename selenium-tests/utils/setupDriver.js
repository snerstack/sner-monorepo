import { Builder } from 'selenium-webdriver'
import firefox from 'selenium-webdriver/firefox.js'

const options = new firefox.Options()
options.addArguments('-headless')

export function setupDriver() {
  return new Builder().forBrowser('firefox').setFirefoxOptions(options).build()
}
