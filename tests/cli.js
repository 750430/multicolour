"use strict"

// Get the testing library.
const tape = require("tape")

// Get Multicolour.
const Multicolour = require("../index.js", { bash: true })

// Where we keep the test content.
const test_content_path = "./tests/test_content/"

tape("CLI initializes an interface", test => {
  // Create an instance of multicolour.
  const multicolour = new Multicolour({ content: test_content_path })

  // Get the CLI from it.
  const cli = multicolour.cli()

  // Test it's not undefined and it is instantiated correctly.
  test.notEqual(typeof cli, "undefined", "CLI should not be undefined")
  test.notEquals(typeof cli.__scope, "undefined", "cli.__scope is is not undefined (set in multicolour.cli).")
  test.deepEquals(cli.__scope, multicolour, "Scope is set to the instance of multicolour instantiated.")
  test.notEquals(typeof cli.program, "undefined", "cli instance has a program.")

  // Reset Multicolour.
  multicolour.reset()

  test.end()
})

tape("CLI scope should change when using `.scope()`", test => {
  test.plan(2)

  // Create an instance of multicolour.
  const multicolour = Multicolour.new_from_config_file_path(`${test_content_path}/config.js`)
  const alt_multicolour = new Multicolour()

  // Get the CLI from it.
  const cli = multicolour
    .cli()
    .scope(alt_multicolour)

  test.deepEquals(cli.__scope, alt_multicolour, "Scope changed to alternative instance of multicolour.")
  test.throws(() => cli.scope(), ReferenceError, "Should throw ReferenceError when no scope provided.")

  multicolour.reset()
})
