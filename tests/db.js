"use strict"

const Async = require("async")

// Get the testing library.
const tape = require("tape")

// Get Multicolour.
const Multicolour = require("../index")

tape("Waterline collections are created by Multicolour on instantiation and we only get expected errors.", test => {
  // Create an instance of multicolour.
  const multicolour = new Multicolour(require("./test_content/config.js")).scan()
  const DB = multicolour.get("database")

  // Enable the user model for seeding.
  test.doesNotThrow(() => multicolour._enable_user_model(), "No error while enablking user model.")

  // Test stuff exists.
  test.notEquals(typeof multicolour.get("blueprints"), "undefined", "Blueprints exists")
  test.notEquals(typeof DB, "undefined", "Database connection exists")

  // Test forceful relationship editing.
  // One to One
  test.doesNotThrow(() => DB.add_relation_to_collection("one2one", "test", "test2"), "Does not throw when forcefully extending collection.")

  // One to Many
  test.doesNotThrow(() => DB.add_relation_to_collection("one2many", "test", "test2", true), "Does not throw when forcefully extending collection as a collection.")

  // "join", is actually just a pretty way to add_relation_to_collection.
  test.doesNotThrow(() => DB
    .join({
      as: "join",
      from: "test2",
      to: "test3",
      many: true
    })
    .join({
      from: "test3",
      to: "test2"
    })
  )

  // Check error behaviour.
  test.throws(() => DB.register_new_model(), TypeError, "Throws error trying to register model with no path.")
  test.throws(() => DB.add_relation_to_collection("fake1", "fake", "test2"), ReferenceError, "Throws when source collection not found.")
  test.throws(() => DB.add_relation_to_collection("fake2", "test", "fake"), ReferenceError, "Throws when target collection not found.")
  test.throws(() => DB.add_relation_to_collection("one2one", "test", "test2"), TypeError, "Throws when trying to overwrite existing relationship.")

  // Seed for some more tests.
  DB.start((err, ontology) => {
    test.ok(!err, "Error in starting DB is undefined.")

    const models = ontology.collections

    const valid_model = {name: "Multicolour", age: 100}
    const invalid_model = {age: 100}
    test.deepEqual(models.test.is_valid(valid_model).value, valid_model, "is_valid class member validates valid object")
    test.ok(models.test.is_valid(invalid_model).error, "is_valid class member validates invalid object")

    // Test various inserts.
    Async.parallel([
      next => models.test.create({name: "test", age: 100, empty: null, test2: 1}, (err, t) => {
        test.equal(err, null, "No error during 1st seed")
        test.doesNotThrow(t.toJSON.bind(t), "Called toJSON on test")
        next()
      }),
      next => models.test2.create({name: "test", age: 100}, (err, t) => {
        test.equal(err, null, "No error during 2nd seed")
        test.doesNotThrow(t.toJSON.bind(t), "Called toJSON on test2")
        next()
      }),
      next => models.multicolour_user.create({
        username: "test",
        name: "test",
        password: "password"
      }, (err, user) => {
        test.equal(err, null, "No error during 3rd seed")
        test.doesNotThrow(user.toJSON.bind(user), "Called toJSON on user")
        next()
      }),
      next => models.multicolour_user.create({
        username: "test2",
        name: "test2",
        email: null
      }, (err, user) => {
        test.equal(err, null, "No error during 4th seed")
        test.doesNotThrow(user.toJSON.bind(user), "Called toJSON on user without password")
        next()
      })
      // Done. We've checked for errors above. Just stop and quit.
    ], () => multicolour.stop(test.end.bind(test)))
  })
})
