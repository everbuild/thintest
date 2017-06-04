const rl = require('readline')
const shared = require('./shared')

let y = 0
const out = process.stderr
const styles = shared.getStyles(out)


class Progress {
    constructor(total, size) {
        this.counts = {total: 0}
        this.total = total
        this.size = size
        this.header = `running ${total} test${total === 1 ? '' : 's'}`
        this.startY = y
        out.write('\n') // reserve an empty line for the progress bar (because render can't output \n!)
        this.render()
    }

    update(tests) {
        this.counts = shared.countBy(tests, test => test.result)
        this.counts.total = tests.length
        this.render()
    }

    render() {
        let rest = this.size

        const blocks = shared.allResults
            .map(result => {
                const num = Math.round(this.size*(this.counts[result] || 0)/this.total)
                rest -= num
                return styles[result] + '■'.repeat(num)
            })
            .join('')

        const pct = Math.floor(100*this.counts.total/this.total)

        const dy = y - this.startY
        rl.moveCursor(out, -10000, -dy)
        out.write(`${this.header} ${blocks}${styles.reset}${'·'.repeat(rest)} ${pct}%`)
        rl.moveCursor(out, -10000, dy)
    }
}


if(out.isTTY) {
    module.exports = Progress
    patchWrite(process.stdout)
    patchWrite(process.stderr)
} else {
    module.exports = class {
        constructor(total) {
            console.log(`running ${total} test${total === 1 ? '' : 's'}...`)
        }
        update() {
        }
    }
}


function patchWrite(stream) {
    // ugly hack because there's no convenient portable way to query the cursor position
    const orig = stream.write
    stream.write = function (chunk) {
        y += chunk.toString().split('\n').length - 1
        orig.apply(stream, arguments)
    }
    return stream
}