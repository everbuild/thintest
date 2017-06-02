// adds "thintest" as a symlink to node_modules so it can be used in it's own tests

const fs = require('fs')
const p = require('path')

try {
    fs.symlinkSync(__dirname, p.join(__dirname, 'node_modules/thintest'), 'junction')
} catch(e) {
    if(e.code !== 'EEXIST') throw e
}