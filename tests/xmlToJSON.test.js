const assert = require('assert')
const fs = require('fs')
const path = require('path')

const { parseXSD } = require('../src/xsdToJSON')

const diff = require('deep-diff')

describe('Basic usage of xsdToJSON', function () {
  const files = fs.readdirSync('./tests/test-xsds')

  files.filter(name => name.endsWith('.xsd')).forEach(function (file) {
    it('parsed xsd should match json', function (done) {
      const xsd = fs.readFileSync(path.join(__dirname, 'test-xsds', file), 'utf8')
      const expected = fs.readFileSync(path.join(__dirname, 'test-xsds', `${file}.expected`), 'utf8')

      parseXSD(xsd, (err, actual) => {
        if (err) done(err)
        const difference = diff(actual, JSON.parse(expected))
        assert.equal(difference, undefined, `failed on ${file} with ${JSON.stringify(difference)}`)
        done()
      })
    })
  })
})
