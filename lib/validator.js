"use strict"

// Get the tools.
const waterline_joi = require("waterline-joi")
const Joi = require("joi")

// Does the attribute have a model or collection property?
const attribute_is_related = attribute => attribute.hasOwnProperty("model") || attribute.hasOwnProperty("collection")

// Does a model have any relationships at all?
const model_has_relationships = model =>
  Object.keys(model).map(attribute => attribute_is_related(model[attribute])).length > 0


class Multicolour_Default_Validation {

  constructor() {
    this.read_schemas = {}
    this.write_schemas = {}

    this.error_schema = Joi.object({
      code: Joi.number(),
      error: Joi.string(),
      message: Joi.string()
    }).unknown(true)
  }

  /**
   * Get the schema for write operations, we have to make two passes.
   * The first pass generates the payloads for each defined model
   * and the second applies any related models payloads.
   *
   * @param  {Waterline.Collection} collection to get payload for.
   * @return {Joi.Schema} Schema for any requests.
   */
  generate_schemas(writeable_schema) {
    const schemas = writeable_schema ? "write_schemas" : "read_schemas"
    const collections = this.multicolour.get("database").get("definitions")

    // First pass, create basic payloads.
    Object.keys(collections).forEach(collection_name => {
      this[schemas][collection_name] = waterline_joi(collections[collection_name].attributes, false)

      // If a writable schema wasn't requested,
      // add the id and createdAt and updatedAt.
      if (!writeable_schema) {
        this[schemas][collection_name].id = Joi.any()
        this[schemas][collection_name].createdAt = Joi.string()
        this[schemas][collection_name].updatedAt = Joi.string()
      }
    })

    // Second pass, make related payloads.
    Object.keys(collections)
      // Only get models with defined relationships.
      .filter(collection_name => model_has_relationships(collections[collection_name].attributes))

      // Add the schema to them.
      .forEach(collection_name => {
        const attributes = Object.assign({}, collections[collection_name].attributes)

        Object.keys(attributes)
          .filter(attribute => attribute_is_related(attributes[attribute]))
          .forEach(attribute => {
            const target = attributes[attribute].collection || attributes[attribute].model
            const collection = this[schemas][collection_name]
            const schema = Joi.object(this[schemas][target]) 
            let set_to = schema

            if (writeable_schema) set_to = Joi.alternatives().try(schema, Joi.object({id: Joi.any()}))

            // Add the relation.
            if (attributes[attribute].model)
              collection[attribute] = set_to
            else if (attributes[attribute].collection)
              collection[attribute] = Joi.array().items(set_to)
          })
      })

    // Convert each to a fully fledged Joi object.
    Object.keys(schemas).forEach(schema_name => {
      this[schemas][schema_name] = Joi.object(this[schemas][schema_name])
    })

    return this
  }

  /**
   * Register with the server properties required by this plugin.
   * @param  {Multicolour_Server_Hapi} server to register to.
   * @return {void}
   */
  register(multicolour) {
    this.multicolour = multicolour

    // Create readable schemas.
    this.generate_schemas(false)

    // Create writable schemas.
    this.generate_schemas(true)

    // Add this validator to the list.
    multicolour.get("validators").set("application/json", this)
  }
}

// Export the plugin.
module.exports = Multicolour_Default_Validation
