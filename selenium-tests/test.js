import Mocha from 'mocha'
import path from 'path'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const mocha = new Mocha({ timeout: 10000 })

const testFiles = ['home.test.js', 'auth/login.test.js']

testFiles.forEach((file) => {
  mocha.addFile(path.join(__dirname, file))
})

mocha
  .loadFilesAsync()
  .then(() => mocha.run((failures) => (process.exitCode = failures ? 1 : 0)))
  .catch(() => (process.exitCode = 1))
