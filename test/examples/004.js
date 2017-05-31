require('thintest').test(class {
    slowish() {
        return new Promise(resolve => setTimeout(resolve, 2000))
    }
})