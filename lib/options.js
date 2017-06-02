const p = require('path')

const packed = fromPackage(process.cwd())

module.exports = overrides => normalize(Object.assign({}, packed, overrides))


function fromPackage(path) {
    let opts = {}
    try {
        opts = require(p.join(path, 'package.json')).thintest || opts
    } catch(e) {
        if(e.code !== 'MODULE_NOT_FOUND') throw e
        const parent = p.join(path, '..')
        if(parent !== path) return fromPackage(parent)
    }
    opts.root = path
    return opts
}


function normalize(opts) {
    opts.root = p.resolve(opts.root)
    opts.testDir = p.resolve(opts.root, opts.testDir || 'test')
    opts.srcDir = p.resolve(opts.root, opts.srcDir || 'src')
    opts.failFast = !!opts.failFast
    opts.progressSize = opts.progressSize > 0 ? Math.round(opts.progressSize) : 40
    opts.assert = opts.assert || 'assert'
    if(typeof opts.assert === 'string') opts.assert = require(opts.assert)
    opts.stackLimit = opts.stackLimit >= 0 ? Math.round(opts.stackLimit) : 5
    opts.maxConcur = opts.maxConcur > 0 ? Math.round(opts.maxConcur) : 10
    opts.expandAll = opts.expandAll === undefined ? true : !!opts.expandAll
    opts.verbose = !!opts.verbose

    if(opts.verbose) console.log([
        'root', 'testDir', 'srcDir', 'failFast', 'progressSize', 'stackLimit', 'maxConcur', 'expandAll'
    ].map(k => `${k}: ${opts[k]}`).join('\n'))

    return opts
}
