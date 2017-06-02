require('thintest').test(class {
    "special method"() {
        this.ok(true)
    }

    "this must fail"() {
        this.ok(false)
    }

     // WARNING in debug this produces exit code 0xC00000FD - stack overflow in stead of an exception??????
/*
    "stack overflow guaranteed"() {
        thisIsTooMuch()
        function thisIsTooMuch() {
            thisIsTooMuch()
        }
    }
*/
})