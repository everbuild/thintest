#!/usr/bin/env node
const minimist = require('minimist')
const tt = require('./index')

const opts = minimist(process.argv.slice(2), {
    default: {
        expandAll: false
    },
    alias: {
        failFast: 'f',
        expandAll: 'a',
        maxConcur: 'c',
        help: 'h',
        verbose: 'v'
    }
})

if(opts.help) {
    console.log(require('fs').readFileSync(require.resolve('./help.txt'), 'utf-8'))
} else {
    tt.run.apply(this, [opts].concat(opts._)).then(report => {
        report.print()
        process.exit(report.failed.length > 0 ? 1 : 0)
    }).catch(error => {
        console.error(error)
        process.exit(2)
    })
}