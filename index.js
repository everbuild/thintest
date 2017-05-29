const p = require('path')
const klaw = require('klaw')


module.exports = run
module.exports.subject = resolveSubject


function run(options, ...tests) {
    if(typeof options === 'string') {
        tests.unshift(options)
        options = null
    }
    options = loadOptions(options)

    const out = options.out
    let skip = false

    out.write('running tests')
    const promisedTests = tests && tests.length > 0 ? Promise.resolve(tests) : listTests(options.testDir)
    return promisedTests.then(tests => Promise.all(tests.map((test, idx) => {
        if(skip) return {test, skipped: true}
        return exec(test).then(result => ({test}), error => {
            skip = options.failFast
            return {test, error}
        }).then(result => {
            const progress = Math.round(options.progressSize*(idx + 1)/tests.length)
            out.write(`\nrunning tests ${'▒'.repeat(progress)}${'░'.repeat(options.progressSize - progress)}`)
            return result
        })
    }))).then(results => {
        out.write('\n')
        return new Report(results)
    })

    class Report {
        constructor(results) {
            this.results = results
        }

        print() {
            out.write(this.toString())
        }

        toString() {
            const joys = this.results.filter(test => !test.error && !test.skipped)
            const tears = this.results.filter(test => test.error)
            let msg = ''
            msg += '\u001b[1m' // bold
            if(tears.length === 0) {
                msg += '\u001b[32m' // green
                msg += joys.length > 1 ? `all ${joys.length} tests succeeded :-D` : 'one and only test succeeded :-)'
            } else {
                if(joys.length > 0) {
                    msg += '\u001b[33m' // yellow
                    msg += `${joys.length} test${joys.length > 1 ? 's' : ''} succeeded but ${tears.length} failed :-|`
                    msg += '\u001b[31m' // red
                } else {
                    msg += '\u001b[31m' // red
                    msg += tears.length > 1 ? `all ${tears.length} tests failed :-S` : 'only 1 test and it failed :\'('
                }
                tears.forEach(tear => {
                    msg += '\n'
                    let stack = tear.error.stack
                    if (stack) {
                        let i = stack.lastIndexOf(tear.test)
                        if(i !== -1) i = stack.indexOf('\n', i)
                        if(i !== -1) stack = stack.substring(0, i)
                        msg += stack
                    } else {
                        msg += tear.error.toString()
                    }
                })
            }
            msg += '\u001b[0m' // reset all styles
            return msg
        }
    }

}


function listTests(path) {
    const exp = /\.js$/
    const tests = []
    return new Promise((resolve, reject) => klaw(path)
        .on('data', data => data.stats.isFile() && exp.test(data.path) && tests.push(data.path))
        .on('end', () => resolve(tests)))
        .on('error', reject)
}


function exec(file) {
    try {
        return Promise.resolve(require(file))
    } catch (e) {
        return Promise.reject(e)
    }
}


function resolveSubject(options) {
    options = loadOptions(options)
    const exp = /at (?:.+\()?(.*?)(?:\:\d+)*\)?$/gm
    const stack = new Error().stack
    const thisFile = exp.exec(stack)[1]
    const callingFile = exp.exec(stack)[1]
    const relativePath = p.relative(options.testDir, callingFile)
    const subjectPath = path.join(options.srcDir, relativePath)
    return require(subjectPath)
}


function loadOptions(overrides) {
    let opts = fromPackage(process.cwd())
    if(overrides) Object.assign(opts, overrides)
    normalizeOptions(opts)
    return opts

    function fromPackage(path) {
        let opts = {}
        try {
            opts = require(p.join(path, 'package.json')).thintest || opts
        } catch(e) {
            if(e.code !== 'MODULE_NOT_FOUND') throw e
            const parent = p.join(path, '..')
            if(parent !== path) return fromPackage(parent)
        }
        opts.root = opts.root && p.isAbsolute(opts.root) || path
        return opts
    }
}


function normalizeOptions(opts) {
    opts.root = p.resolve(opts.root)
    opts.out = opts.out === null ? {write: () => true} : (opts.out || process.stdout)
    opts.testDir = p.resolve(opts.root, opts.testDir || 'test')
    opts.srcDir = p.resolve(opts.root, opts.srcDir || 'src')
    opts.failFast = !!opts.failFast
    opts.progressSize = opts.progressSize > 0 ? Math.round(opts.progressSize) : 40
}