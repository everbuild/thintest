const tt = require('thintest')

tt.test(class {
    'run some tests via the API'() {
        console.log('---- child test output ----')
        return tt.run({testDir: 'examples'}).then(report => {
            this.equal(report.tests.length, 5)
            const successes = report.tests.filter(test => test.result === tt.SUCCEEDED)
            const failures = report.tests.filter(test => test.result === tt.FAILED)
            const skipped = report.tests.filter(test => test.result === tt.SKIPPED)
            this.equal(successes.length, 4)
            this.equal(failures.length, 1)
            this.equal(skipped.length, 0)
            const failed = failures[0]
            this.equal(failed.name, '001')
            this.equal(failed.file, 'C:\\dev\\thintest\\examples\\001.js')
            this.equal(failed.result, tt.FAILED)
            console.log(report.toString())
            console.log('---------------------------')
        })
    }

    'validate report'() {
        console.log('---- child test output ----')
        return tt.run({testDir: 'examples'}, 'minimal.js').then(report => {
            const reportString = report.toString()
            console.log(reportString)
            const plain = reportString.replace(/\u001b\[.*?m/g, '')
            this.equal(plain, '1 succeeded\nminimal - Mmmm π > succeeded')
            console.log('---------------------------')
        })
    }
})