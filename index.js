const p = require('path')
const klaw = require('klaw')
const getOptions = require('./lib/options')
const Runner = require('./lib/Runner')
const Test = require('./lib/Test')
const shared = require('./lib/shared')


const tt = module.exports = {
    SKIPPED: shared.SKIPPED,
    SUCCEEDED: shared.SUCCEEDED,
    FAILED: shared.FAILED,

    // called from a test file to define and run only itself
    test: spec => new Test(resolveTestFile()).run(spec),

    // called by the CLI (or another API user) to run multiple test files and show aggregated results
    run: (overrides, ...patterns) => {
        if(typeof overrides === 'string') {
            patterns.unshift(overrides)
            overrides = null
        }

        const options = getOptions(overrides)

        // TODO just making patterns absolute will not always work (eg. what about *.js = basename matching)
        patterns = patterns.map(pattern => (p.isAbsolute(pattern) ? pattern : p.join(options.testDir, pattern)).replace(/\\/g, '/'))

        return listTestFiles(options.testDir)
            .then(files => patterns.length > 0 ? require('micromatch')(files, patterns, {basename: true, unixify: false}) : files)
            .then(files => new Runner(options, files).start())
            .catch(shared.crash)
    }
}


function listTestFiles(path) {
    const exp = /\.js$/
    const tests = []
    return new Promise((resolve, reject) => klaw(path)
        .on('data', data => data.stats.isFile() && exp.test(data.path) && tests.push(data.path))
        .on('end', () => resolve(tests))
        .on('error', e => {
            if(e.code === 'ENOENT') resolve([])
            else reject(e)
        }))
}


function resolveTestFile() {
    const frame = shared.parseStack(new Error().stack).find(frame => frame.file && frame.file !== __filename)
    if(!frame) throw new Error("Can't determine test name")
    return frame.file
}