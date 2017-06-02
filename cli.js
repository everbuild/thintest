#!/usr/bin/env node
const minimist = require('minimist')
const tt = require('./index')
const shared = require('./lib/shared')

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
    tt.run.apply(tt, [opts].concat(opts._)).then(shared.exit).catch(shared.crash)
}