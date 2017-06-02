> Lightweight test framework for JavaScript/Node

A down to earth test framework for Node that allows you to write your tests in plain JavaScript/ES6,
using whatever assertion mechanism you prefer.
There's no magic framework syntax, so no transpilation is needed and running and debugging tests is fast and easy!
It can be used for unit testing or integration testing, and supports asynchronous tests. 

To see what a thin test looks like, [jump right to here](#tests).
 
**Contents**

1. [Install](#install)
2. [Usage](#usage)
3. [Config](#config)
4. [Tests](#tests)
5. [API](#api)
6. [Limitations](#limitations)

# Install

```
$ npm install --saveDev thintest
```
You can add ``--global`` to install the "binary" globally, but it's usually not necessary as `thintest` can be easily setup though NPM scripts.

# Usage

As `npm test` script:
```
// package.json
{
  "scripts": {
    "test": "node thintest"
  },
  "thintest": {
    // options
  }
}
```

Directly via command-line:
```
$ [node_modules/.bin/]thintest --testDir=test common/**/* user/**/* 
```
`--testDir` sets the parent dir containing your tests (relative to `cwd`), and is completely redundant here as 'test' is the default.
The [glob expressions][glob] at the end describe paths to the test files to be run, relative to your test dir. 
If no such files are specified, all tests in your test dir are run.

(The `node_modules/.bin/` prefix is not needed with a `--global` install.)

For details and other options, see [Config](#config).

It's also possible to run any test file directly simply via the trusted node command (also works from within your IDE, just saying):
```
$ node my-awesome-test 
```
Note however that it's not possible to pass any CLI parameters (like the --testDir above) this way.
Therefore it's advised to setup all common options in your `package.json` and use CLI parameters for exceptional cases only.

Finally, if you're integrating with other tools, you can also use the [API](#api).

# Config

Config can be done either:

1. by adding a `"thintest": {options}` entry to your `package.json`
2. via CLI parameters
3. if using the [API](#api): via the options argument

Each one overriding the previous, i.e. if an option is defined in your `package.json`, you can override it with the same CLI parameter.
(Note that the API doesn't consider CLI parameters, that's up to you.)

option          | CLI parameter         | Default       | Meaning
----------------|-----------------------|---------------|--------
`root`          | `--root`              | location of the nearest package.json from `cwd` up | Path containing your package.json. Used as base for other relative paths.
`testDir`       | `--testDir=<path>`    | `"test"`      | Path containing your test files
`srcDir`        | `--srcDir=<path>`     | `"src"`       | Path containing your source files
`failFast`      | `--failFast, -f`      | `false`       | Skip further tests as soon as possible after a failed test
`progressSize`  | `--progressSize`      | `40`          | Number of characters to use for the progress bar
`assert`        | `--assert`            | [`"assert"`][node assert] | Module ID of assert package to inject into your tests
`stackLimit`    | `--stackLimit`        | `5`           | Limit the number of stack frames to print for failed tests
`maxConcur`     | `--maxConcur, -c`     | `10`          | Limit the number of tests to run simultaneously
`expandAll`     | `--expandAll, -a`     | `false`       |  Also include details about successful and skipped tests in the output
 
# Tests

Example:

```ecmascript 6
// file: test/users/manager.js

require('thintest').test(class { // tests are specified by ES6 classes

    testRootUser() { // each method defines a test case
        // this.subject is a getter property returning the exported value from the inferred subject module
        // with standard config, this would be 'src/users/manager.js' in this case.
        const root = this.subject.getRoot()
        
        // for your convenience, all members of the configured assert lib are assigned to 'this'
        this.ok(root)
        this.equal(root.id, 0)
        this.deepStrictEqual(root.name, {first: 'Emmanuel', last: 'Macron'})
    }

    'we can load the test user'() { // if you like you could use strings as method names!
        const id = 'test-user-id'
        
        // for async testing, just return a promise!
        // the test case will be considered done when the promise resolves
        // rejected promises result in test failures
        return this.subject.load(id).then(user => { 
            this.ok(user)
            this.equal(user.id, id)
            // ...
        })
    }
    
    // ...
})
```

## More about `this.subject`

`thintest` infers the path of the subject module based on the path of your test file.
It basically takes the part of the path after `testDir` and adds that to `srcDir`, therefore these 2 options 
need to be [setup correctly](#config) for this to work.
The path is then [require](https://nodejs.org/api/globals.html#globals_require)d and the exported value is returned from the getter. 
This is merely a convenience feature and you're definitely not obliged to use it.
Since it's a getter property, it will only be run when you actually use it.

Sometimes however, creating a subject is more complex or there's no corresponding source module.
In those cases you can still use the convenience of `this.subject` by setting it yourself in the constructor of your test class.
If `thintest` detects this, it will leave your subject as is and won't create a getter.

Example:

```ecmascript 6
require('thintest').test(class {

    constructor(subjectPath) { // you still get the inferred subject path for free, off course you don't need to use it
        const SubjectClass = require(subjectPath)
        this.subject = new SubjectClass()
    }
    
    // ...
})
```

## More about assertions

You can use any assertion lib you like.
Standard [Node assert][node assert] is often all you need, but [there are plenty flavours][assert alt]. 

Any errors thrown by your tests will be caught, reported and will be considered as test failures.

Require your assertion lib yourself in each test file or ask `thintest` nicely to inject it so you can access it's functions via `this`, see [Config](#config).

## More about test execution

`thintest` launches batches of `maxConcur` tests in parallel.
This may be a bit misleading as sync tests will still execute sequentially (this is still JavaScript, no multi-threading).
You will benefit from this more with async tests, as they won't block other tests from running (as long as < `maxConcur` tests are busy simultaneously).

Within tests however, test case methods always run sequentially.
Even when they're async, the next case will only execute after the previous promise is resolved.
A new instance of your test class is created before running each test case.

The `failFast` option can be convenient in a release script.
You probably don't want to release if any test fails and you don't really care at this point how many other tests might succeed.
Don't be surprised however if `failFast` doesn't stop your tests immediately.
Because `maxConcur` tests are launched in parallel, all running tests will still complete.
If you only have few tests it can appear as if `failFast` isn't working at all.
Tweaking the `maxConcur` option in these cases may help.
It really should've been called `failAsFastAsPossible`.

# API

```ecmascript 6
const tt = require('thintest')

tt.run([{options}], ...tests).then(report => {
    report.hasFailures() // true if any tests failed
    report.toString() // generate a string representing this report
    report.print() // just prints the toString()

    // array of executed tests
    report.tests.forEach(test => {
        test.name // name of the test, e.g. "dir 1 : dir 2 : filename"
        test.file // absolute path to test file
        test.relative // relative path to test file
        test.subjectFile // absolute path to subject file
        test.result // overall test result: tt.SUCCEEDED | tt.FAILED | tt.SKIPPED
        test.methods // object mapping executed methods to results: {"method name": tt.SUCCEEDED | tt.SKIPPED | error object/value }
    })
})
```

# Limitations

* There are currently no plans to support testing against or in a (virtual) browser.
* The minimalistic philosophy of `thintest` also means that the test "vocabulary" (plain JS) is perhaps too limited to some people's taste.

[Other tools][alt] exist that are more suited in those cases.


[glob]: https://github.com/micromatch/micromatch#matching-features
[node assert]: https://nodejs.org/api/assert.html
[assert alt]: https://stackoverflow.com/questions/14294567/assertions-library-for-node-js
[alt]: http://stateofjs.com/2016/testing/