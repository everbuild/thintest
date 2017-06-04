require('thintest').test(class {
    slow() {
        return new Promise(resolve => setTimeout(resolve, 1000))
    }
})