const tt = require('thintest')

tt.test(class {
    'run some tests via the API'() {
        // disable output because it would mix with the output of the parent test process
        return tt.run('examples/*.js').then(report => {
            this.equal(report.tests.length, 5)
            this.equal(report.failed.length, 1)
            this.equal(report.succeeded.length, 4)
            this.equal(report.skipped.length, 0)
            const failed = report.failed[0]
            this.equal(failed.name, 'examples : 001')
            this.equal(failed.file, 'C:\\dev\\thintest\\test\\examples\\001.js')
            this.equal(failed.result, tt.FAILED)
            console.log('---- child test output ----')
            console.log(report.toString())
            console.log('---------------------------')
        })
    }

    'validate report'() {
        return tt.run('examples/minimal.js').then(report => {
            const reportString = report.toString()
            console.log('---- child test output ----')
            console.log(reportString)
            console.log('---------------------------')
            const plain = reportString.replace(/\u001b\[.*?m/g, '')
            this.equal(plain, '1 test processed: 1 succeeded\nexamples : minimal - Mmmm π > succeeded')
        })
    }
})