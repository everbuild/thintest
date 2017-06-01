const shared = require('./shared')


// cf. https://en.wikipedia.org/wiki/ANSI_escape_code
const styles = {
    success: '\u001b[32;1m', // green
    mixed: '\u001b[33;1m', // yellow
    skipped: '\u001b[36;0m', // cyan
    failed: '\u001b[31;1m', // red
    reset: '\u001b[0m'
}


module.exports = class Report {
    constructor(options, tests) {
        this.options = options
        this.tests = tests
        this.succeeded = []
        this.failed = []
        this.skipped = []
        for(let test of tests) {
            const key = test.result === shared.SUCCEEDED ? 'succeeded' : test.result === shared.SKIPPED ? 'skipped' : 'failed'
            this[key].push(test)
        }
    }

    print() {
        this.options.out.write(this.toString() + '\n')
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
        else if(this.options.failFast || yesCount/total < 0.8) color = styles.failed
        else color = styles.mixed

        let stats = []
        if(yesCount > 0) stats.push(`${yesCount} succeeded`)
        if(dohCount > 0) stats.push(`${styles.failed}${dohCount} failed${color}`)
        if(skipCount > 0) stats.push(`${skipCount} ${skipCount === 1 ? 'was' : 'were'} skipped`)

        let msg = `${color}${total} test${total === 1 ? '' : 's'} processed: ${stats.join(', ')}`

        this.tests.forEach(test => {
            if(test.result === shared.SKIPPED) {
                if(this.options.expandAll) msg += `\n${styles.skipped}${test.name} > skipped`
            } else for(let method in test.methods) {
                const result = test.methods[method]
                if(result === shared.SUCCEEDED) {
                    if(this.options.expandAll) msg += `\n${styles.success}${test.name} - ${method} > succeeded`
                } else if(result === shared.SKIPPED) {
                    if(this.options.expandAll) msg += `\n${styles.skipped}${test.name} - ${method} > skipped`
                } else {
                    msg += `\n${styles.failed}${test.name} - ${method} > `
                    let stack = result.stack
                    if (stack) {
                        let frames = shared.parseStack(stack)
                        const i = frames.slice().reverse().findIndex(frame => frame.file === test.file)
                        frames = frames.slice(0, Math.min(frames.length - i, this.options.stackLimit + 1))
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