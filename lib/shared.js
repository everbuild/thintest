
// stack of active runners, if any
// in standalone mode (test file being run directly), there are no runners
// in practice there rarely are multiple runners active at the same time
// (only happens when calling run from within a test, i.e. "nested" tests such as in the self test)
exports.runnerStack = []


exports.SKIPPED = Symbol('skipped')
exports.SUCCEEDED = Symbol('succeeded')
exports.FAILED = Symbol('failed')


exports.parseStack = function (stack) {
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


exports.crash = function (error) {
    // error outside of test - bail out!
    console.error(error)
    process.exit(2)
}
