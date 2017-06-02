require('thintest').test(class {
    'Mmmm π'() {
        this.equal(Math.round(Math.PI*100000000), 314159265)
    }
})