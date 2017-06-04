const p = require('path')

let packed

module.exports = overrides => {
    if(!packed) {
        const path = overrides && overrides.baseDir
        packed = fromPackage(path || process.cwd(), !path)
    }
    return normalize(Object.assign({}, packed, overrides))
}


function fromPackage(path, tryParents) {
    let opts = {}
    try {
        opts = require(p.join(path, 'package.json')).thintest || opts
    } catch(e) {
        if(e.code !== 'MODULE_NOT_FOUND') throw e
        if(tryParents) {
            const parent = p.join(path, '..')
            if(parent !== path) return fromPackage(parent, true)
        }
        console.warn('Warning: no package.json found')
    }
    opts.baseDir = path
    return opts
}


function normalize(opts) {
    opts.baseDir = p.resolve(opts.baseDir)
    opts.testDir = p.resolve(opts.baseDir, opts.testDir || 'test')
    opts.srcDir = p.resolve(opts.baseDir, opts.srcDir || 'src')
    opts.failFast = !!opts.failFast
    opts.progressSize = opts.progressSize > 0 ? Math.round(opts.progressSize) : 40
    opts.assert = opts.assert || 'assert'
    if(typeof opts.assert === 'string') opts.assert = require(opts.assert)
    opts.stackLimit = opts.stackLimit >= 0 ? Math.round(opts.stackLimit) : 5
    opts.maxConcur = opts.maxConcur > 0 ? Math.round(opts.maxConcur) : 10
    opts.expandAll = opts.expandAll === undefined ? true : !!opts.expandAll
    opts.verbose = !!opts.verbose

    if(opts.verbose) console.log([
        'baseDir', 'testDir', 'srcDir', 'failFast', 'progressSize', 'stackLimit', 'maxConcur', 'expandAll'
    ].map(k => `${k}: ${opts[k]}`).join('\n'))

    return opts
}
