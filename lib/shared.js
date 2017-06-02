const s = exports

// stack of active runners, if any
// in standalone mode (test file being run directly), there are no runners
// in practice there rarely are multiple runners active at the same time
// (only happens when calling run from within a test, i.e. "nested" tests such as in the self test)
s.runnerStack = []


s.SKIPPED = Symbol('skipped')
s.SUCCEEDED = Symbol('succeeded')
s.FAILED = Symbol('failed')


s.allResults = [s.SUCCEEDED, s.FAILED, s.SKIPPED]


s.resultLabels = {
    [exports.SUCCEEDED]: 'succeeded',
    [exports.SKIPPED]: 'skipped',
    [exports.FAILED]: 'failed'
}


// cf. https://en.wikipedia.org/wiki/ANSI_escape_code
s.getStyles = stream => stream.isTTY ? {
    [s.SUCCEEDED]: '\u001b[32;1m', // green
    [s.SKIPPED]: '\u001b[36;1m', // cyan
    [s.FAILED]: '\u001b[31;1m', // red
    reset: '\u001b[0m'
} : {
    [s.SUCCEEDED]: '',
    [s.SKIPPED]: '',
    [s.FAILED]: '',
    reset: ''
}


s.parseStack = function (stack) {
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


s.crash = function (error) {
    // error outside of test - bail out!
    console.error(error)
    process.exit(2)
}


s.exit = function (report) {
    report.print()
    process.exit(report.hasFailures() ? 1 : 0)
}


s.countBy = (list, getKey) => list.reduce((map, item) => {
    const key = getKey(item)
    map[key] = (map[key] || 0) + 1
    return map
}, {})