const shared = require('./shared')
const Report = require('./Report')


class Runner {
    constructor(options, files) {
        this.options = options
        this.files = files
        this.printProgress = options.out === process.stdout ? progress => {
            progress = Math.round(options.progressSize*progress)
            options.out.write(`\rrunning tests [${'·'.repeat(progress)}${' '.repeat(options.progressSize - progress)}]`)
        } : x => x
    }

    start() {
        if(this.files.length === 0) return Promise.resolve(new Report(this.options, []))

        this.printProgress(0)
        shared.runnerStack.push(this)

        this.tests = []
        this.launchCount = 0

        return new Promise(resolve => {
            this.resolve = resolve
            this.launchTests()
        }).then(() => {
            this.options.out.write('\n')
            if(shared.runnerStack.pop() !== this) throw new Error('util.runnerStack.pop() !== this')
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

        this.printProgress(this.tests.length/this.files.length)

        if(this.tests.length < this.files.length) this.launchTests()
        else this.resolve()
    }
}


module.exports = Runner