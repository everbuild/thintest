const p = require('path')
const Report = require('./Report')
const getOptions = require('./options')
const shared = require('./shared')


class Test {
    constructor(file, result) {
        const runners = shared.runnerStack
        this.runner = runners.length > 0 && runners[runners.length - 1]
        this.options = this.runner ? this.runner.options : getOptions()
        this.file = file
        const relative = p.relative(this.options.testDir, file)
        this.subjectFile = p.join(this.options.srcDir, relative)
        this.name = relative.replace(new RegExp('\\' + p.sep, 'g'), ' : ').replace(/\.js$/, '')
        this.result = result || shared.SUCCEEDED
        this.methods = {}
    }

    run(spec) {
        Object.getOwnPropertyNames(spec.prototype)
            .filter(method => method !== 'constructor' && typeof spec.prototype[method] === 'function')
            .reduce((promise, method) => promise.then(() => {
                    if(this.options.failFast && this.result === shared.FAILED) {
                        this.methods[method] = shared.SKIPPED
                    } else {
                        this.methods[method] = shared.SUCCEEDED
                        const inst = new spec(this.subjectFile)
                        Object.assign(inst, this.options.assert)
                        if(!inst.subject) Object.defineProperty(inst, 'subject', {get: () => require(this.subjectFile)})
                        return inst[method]()
                    }
                }).catch(error => {
                    this.result = shared.FAILED
                    this.methods[method] = error
                }),
                Promise.resolve()
            )
            .then(() => this.runner ? this.runner.finish(this) : new Report(this.options, [this]).print())
            .catch(shared.crash)
    }
}


module.exports = Test