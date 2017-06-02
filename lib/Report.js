const shared = require('./shared')


const styles = shared.getStyles(process.stdout)
const labels = shared.resultLabels


module.exports = class Report {
    constructor(options, tests) {
        this.options = options
        this.tests = tests
    }

    hasFailures() {
        return !!this.tests.find(test => test.result === shared.FAILED)
    }

    print() {
        console.log(this.toString())
    }

    toString() {
        const counts = shared.countBy(this.tests, test => test.result)

        let msg = shared.allResults
            .filter(result => counts[result])
            .map(result => `${styles[result]}${counts[result]} ${labels[result]}`)
            .join(', ')

        const addLine = this.options.expandAll ? (name, result) => msg += `\n${styles[result]}${name} > ${labels[result]}` : x => x

        this.tests.forEach(test => {
            if(test.result === shared.SKIPPED) {
                addLine(test.name, test.result)
            } else for(let method in test.methods) {
                const result = test.methods[method]
                if(result === shared.SUCCEEDED || result === shared.SKIPPED) {
                    addLine(`${test.name} - ${method}`, result)
                } else {
                    msg += `\n${styles[shared.FAILED]}${test.name} - ${method} > `
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