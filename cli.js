#!/usr/bin/env node
const run = require('./index')

const opts = loadOptions() // TODO
const tests = process.argv.slice(2)
const args = [opts].concat(tests)

run.apply(this, args).then(report => {
    report.print()
    process.exit(report.results.find(test => test.error) ? 1 : 0)
}, error => {
    console.error(error)
    process.exit(1)
})
