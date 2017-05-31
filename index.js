const p = require('path')
const klaw = require('klaw')


const tt = module.exports = {
    SKIPPED: Symbol('skipped'),
    SUCCEEDED: Symbol('succeeded'),
    FAILED: Symbol('failed'),
    
    test: test,
    run: run
}


// cf. https://en.wikipedia.org/wiki/ANSI_escape_code
const styles = {
    success: '\u001b[32;1m', // green
    mixed: '\u001b[33;1m', // yellow
    skipped: '\u001b[36;0m', // cyan
    failed: '\u001b[31;1m', // red
    reset: '\u001b[0m'
}


// excuses for using these semi-globals:
// tests can be triggered either by being required by the runner or by being run directly
// we need options in both cases, but only want to load them once with the runner
let options
// done contains a function that is called when each test is done
// this allows the runner to install a hook to receive finished tests
// since we don't want to force the user to export anything specific from their test files, this is the only way
// the default function is used when running a test file directly to print the results
let done = test => new Report([test]).print()


// called from a test file to define and run only itself
function test(spec) {
    loadOptions()
    new Test(resolveTestFile()).run(spec)
}


// called by the CLI (or another API user) to run multiple test files and show aggregated results
function run(overrides, ...files) {
    if(typeof overrides === 'string') {
        files.unshift(overrides)
        overrides = null
    }
    loadOptions(overrides)

    const out = options.out
    const printProgress = out === process.stdout ? progress => {
        progress = Math.round(options.progressSize*progress)
        out.write(`\rrunning tests [${'·'.repeat(progress)}${' '.repeat(options.progressSize - progress)}]`)
    } : x => x

    printProgress(0)

    const promisedFiles = files && files.length > 0 ? Promise.resolve(files) : listTestFiles()

    return promisedFiles.then(files => {
        if(files.length === 0) return []
        return new Promise(resolve => {
            const tests = []
            let launchCount = 0

            const launchTests = () => {
                while(launchCount < Math.min(files.length, tests.length + options.maxConcur)) {
                    const file = files[launchCount ++]
                    setImmediate(() => require(file))
                }
            }

            done = test => {
                tests.push(test)

                if(options.failFast && test.result === tt.FAILED) {
                    // mark all remaining tests as skipped
                    while(launchCount < files.length) {
                        tests.push(new Test(files[launchCount ++], tt.SKIPPED))
                    }
                }

                printProgress(tests.length/files.length)

                if(tests.length < files.length) launchTests()
                else resolve(tests)
            }

            launchTests()
        }).then(tests => {
            out.write('\n')
            return new Report(tests)
        }).catch(crash)
    })
}


function listTestFiles() {
    const exp = /\.js$/
    const tests = []
    return new Promise((resolve, reject) => klaw(options.testDir)
        .on('data', data => data.stats.isFile() && exp.test(data.path) && tests.push(data.path))
        .on('end', () => resolve(tests))
        .on('error', reject))
}


function resolveTestFile() {
    const frame = parseStack(new Error().stack).find(frame => frame.file && frame.file !== __filename)
    if(!frame) throw new Error("Can't determine test name")
    return frame.file
}


function parseStack(stack) {
    const errorExp = /^(.*?): (.*)$/
    const frameExp = /^\s*at (?:(.+) \()?(.*?)((?:\:\d+)*)\)?$/
    return stack.split('\n').map(line => {
        let matches = line.match(frameExp)
        if(matches) {
            return {
                line,
                func: matches[1],
                file: matches[2],
                loc: matches[3]
            }
        }
        matches = line.match(errorExp)
        if(matches) {
            return {
                line,
                error: matches[1],
                msg: matches[2]
            }
        }
        return {line}
    })
}


function loadOptions(overrides) {
    if(options) return

    options = fromPackage(overrides.root || process.cwd())
    if(overrides) Object.assign(options, overrides)
    normalize(options)
    if(options.verbose) options.out.write([
        'root', 'testDir', 'srcDir', 'failFast', 'progressSize', 'stackLimit', 'maxConcur', 'expandAll'
    ].map(k => `${k}: ${options[k]}\n`).join(''))

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
        opts.out = opts.out === null ? {write: () => true} : (opts.out || process.stdout)
        opts.testDir = p.resolve(opts.root, opts.testDir || 'test')
        opts.srcDir = p.resolve(opts.root, opts.srcDir || 'src')
        opts.failFast = !!opts.failFast
        opts.progressSize = opts.progressSize > 0 ? Math.round(opts.progressSize) : 40
        opts.assert = opts.assert || 'assert'
        if(typeof opts.assert === 'string') opts.assert = require(opts.assert)
        opts.stackLimit = opts.stackLimit > 0 ? opts.stackLimit : 5
        opts.maxConcur = opts.maxConcur > 0 ? Math.round(opts.maxConcur) : 10
        opts.expandAll = opts.expandAll === undefined ? true : !!opts.expandAll
        opts.verbose = !!opts.verbose
    }
}


function crash(error) {
    // error outside of test - bail out!
    console.error(error)
    process.exit(2)
}


class Test {
    constructor(file, result) {
        this.file = file
        const relative = p.relative(options.testDir, file)
        this.subjectFile = p.join(options.srcDir, relative)
        this.name = relative.replace(new RegExp('\\' + p.sep, 'g'), ' : ').replace(/\.js$/, '')
        this.result = result || tt.SUCCEEDED
        this.methods = {}
    }

    run(spec) {
        Object.getOwnPropertyNames(spec.prototype)
            .filter(method => method !== 'constructor' && typeof spec.prototype[method] === 'function')
            .reduce((promise, method) => promise.then(() => {
                    if(options.failFast && this.result === tt.FAILED) {
                        this.methods[method] = tt.SKIPPED
                    } else {
                        this.methods[method] = tt.SUCCEEDED
                        const inst = new spec(this.subjectFile)
                        Object.assign(inst, options.assert)
                        if(!inst.subject) Object.defineProperty(inst, 'subject', {get: () => require(this.subjectFile)})
                        return inst[method]()
                    }
                }).catch(error => {
                    this.result = tt.FAILED
                    this.methods[method] = error
                }),
                Promise.resolve()
            )
            .then(() => done(this)).catch(crash)
    }
}


class Report {
    constructor(tests) {
        this.tests = tests
        this.succeeded = []
        this.failed = []
        this.skipped = []
        for(let test of tests) {
            const key = test.result === tt.SUCCEEDED ? 'succeeded' : test.result === tt.SKIPPED ? 'skipped' : 'failed'
            this[key].push(test)
        }
    }

    print() {
        options.out.write(this.toString() + '\n')
    }

    toString() {
        const yesCount = this.succeeded.length
        const dohCount = this.failed.length
        const skipCount = this.skipped.length
        const total = this.tests.length

        let color
        if(yesCount === total) color = styles.success
        // if at least 80% of tests were successful, show in "mixed" style, which is not as harsh as "failed" style
        // unless failFast is on, in which case we don't know how many skipped tests might otherwise be successful
        else if(options.failFast || yesCount/total < 0.8) color = styles.failed
        else color = styles.mixed

        let stats = []
        if(yesCount > 0) stats.push(`${yesCount} succeeded`)
        if(dohCount > 0) stats.push(`${styles.failed}${dohCount} failed${color}`)
        if(skipCount > 0) stats.push(`${skipCount} ${skipCount === 1 ? 'was' : 'were'} skipped`)

        let msg = `${color}${total} test${total === 1 ? '' : 's'} processed: ${stats.join(', ')}`

        this.tests.forEach(test => {
            if(test.result === tt.SKIPPED) {
                if(options.expandAll) msg += `\n${styles.skipped}${test.name} > skipped`
            } else for(let method in test.methods) {
                const result = test.methods[method]
                if(result === tt.SUCCEEDED) {
                    if(options.expandAll) msg += `\n${styles.success}${test.name} - ${method} > succeeded`
                } else if(result === tt.SKIPPED) {
                    if(options.expandAll) msg += `\n${styles.skipped}${test.name} - ${method} > skipped`
                } else {
                    msg += `\n${styles.failed}${test.name} - ${method} > `
                    let stack = result.stack
                    if (stack) {
                        let frames = parseStack(stack)
                        const i = frames.findIndex(frame => frame.file === __filename)
                        frames = frames.slice(0, Math.min(i < 0 ? frames.length : i, options.stackLimit + 1))
                        msg += frames.map(frame => frame.msg ? frame.msg : frame.line).join('\n')
                    } else {
                        msg += result.toString()
                    }
                }
            }
        })

        msg += styles.reset

        return msg
    }
}