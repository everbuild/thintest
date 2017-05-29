> Minimal JavaScript (Node) test runner

Tests are just plain JS files that can be run (and debugged!) directly by Node without needing any special frameworks, compilation, etc...
`thintest` basically provides a simple runner that finds all tests in a specific directory, runs them and prints a clear report.

This minimalistic philosophy also means the "vocabulary" of a test is limited to plain JS code.
If you need anything more elaborate, like BDD, look elsewhere.

# Install

```
$ npm install --saveDev thintest
```
You can add ``--global`` to install the "binary" globally, but it's usually not necessary as `thintest` can be easily setup though NPM scripts.

# Usage

As `npm test` script:

```json
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

Via command-line directly:
```
$ [node_modules/.bin/]thintest [--testDir=<path to test directory>] [test 1] [test 2] ... 
```
For other options, see [Config]. If no tests are specified, all tests are run.

Or by using the API:
```ecmascript 6
const thintest = require('thintest')

thintest([{options}], ...tests).then(report => report.print())
```

# Config

Config can be done either:

* if using the command-line or as `npm test` script: 
  via CLI parameters and/or by adding a `"thintest": {options}` entry to your `package.json` (former override latter).
* if using the API: via the options argument (see [Usage])

options object | CLI parameter      | Default  | Meaning
---------------|--------------------|----------|--------
`testDir`      | `--testDir=<path>` | `"test"` | directory containing your tests
`srcDir`       | `--srcDir=<path>`  | `"src"`  | directory containing your source files
`out`          | N/A                | `stdout` | [Writable Stream](https://nodejs.org/api/stream.html#stream_writable_streams) to recieve any output; set to `null` to disable all output

All paths are resolved via [`path.resolve()`](https://nodejs.org/api/path.html#path_path_resolve_paths), 
meaning they can be absolute or relative to the working directory.
 
# Tests

Example:

```ecmascript 6
const assert = require('assert')

assert.equal(Math.round(Math.PI*10000), 31416)
```

## Assertions

Use any assertion lib you like (standard [Node assertions](https://nodejs.org/api/assert.html) for example).
Any errors thrown by your tests will be caught, reported and will be considered as test failures.

## Async

Your tests can also be async: just export a promise (e.g. `module.exports = new Promise(...)`).
Rejected promises are also considered test failures.

## Test subject

`thintest` also provides a utility to easily get a test subject (what is being tested) according to the convention that 
the test name and path should be the same as the subject name and path.

```ecmascript 6
const MySubject = require('thintest').subject([{options}])
```
`.subject()` resolves the path of the subject file based on the path of the calling test file 
and [require](https://nodejs.org/api/globals.html#globals_require)s it.
It basically takes the part of the test file path after `testDir` and adds that to `srcDir`, therefore these 2 options 
need to be [setup correctly](Config) for this to work.
The same options as for the `thintest` API can optionally be passed in.
If omitted, those from `package.json` will be used.