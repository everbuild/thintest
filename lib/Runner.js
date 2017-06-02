const assert = require('assert')
const rl = require('readline')
const shared = require('./shared')
const Test = require('./Test')
const Report = require('./Report')
const Progress = require('./Progress')


module.exports = class Runner {
    constructor(options, files) {
        this.options = options
        this.files = files
    }

    start() {
        if(this.files.length === 0) return Promise.resolve(new Report(this.options, []))

        this.progress = new Progress(this.files.length, this.options.progressSize)
        shared.runnerStack.push(this)

        this.tests = []
        this.launchCount = 0

        return new Promise(resolve => {
            this.resolve = resolve
            this.launchTests()
        }).then(() => {
            assert.strictEqual(shared.runnerStack.pop(), this)
            return new Report(this.options, this.tests)
        })
    }

    launchTests() {
        while(this.launchCount < Math.min(this.files.length, this.tests.length + this.options.maxConcur)) {
            const file = this.files[this.launchCount ++]
            setImmediate(() => {
                // make sure the test file isn't already cached, otherwise it won't be run again!
                require.cache[file] = undefined
                require(file)
            })
        }
    }

    finish(test) {
        this.tests.push(test)

        if(this.options.failFast && test.result === shared.FAILED) {
            // mark all remaining tests as skipped
            while(this.launchCount < this.files.length) {
                this.tests.push(new Test(this.files[this.launchCount ++], shared.SKIPPED))
            }
        }

        this.progress.update(this.tests)

        if(this.tests.length < this.files.length) this.launchTests()
        else this.resolve()
    }
}