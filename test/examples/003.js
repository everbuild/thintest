require('thintest').test(class {
    verySlow() {
        return new Promise(resolve => setTimeout(resolve, 3000))
    }
})