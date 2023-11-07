import { until } from 'selenium-webdriver'

export async function loginUser(driver) {
  await driver.get('http://localhost:4173' + '/auth/login')

  const usernameField = await driver.wait(until.elementLocated({ name: 'username' }))
  const passwordField = await driver.wait(until.elementLocated({ name: 'password' }))
  const loginButton = await driver.wait(until.elementLocated({ xpath: '//input[@value="Login"]' }))

  await usernameField.sendKeys(process.env.USERNAME)
  await passwordField.sendKeys(process.env.PASSWORD)
  await loginButton.click()
}
