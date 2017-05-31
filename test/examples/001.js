require('thintest').test(class {
    "special method"() {
        this.ok(true)
    }

    "this must fail"() {
        this.ok(false)
    }

    "stack overflow guaranteed"() {
        thisIsTooMuch()
        function thisIsTooMuch() {
            thisIsTooMuch()
        }
    }
})