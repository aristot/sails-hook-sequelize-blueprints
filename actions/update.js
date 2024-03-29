/**
 * Module dependencies
 */

const actionUtil = require('../actionUtil'),
      util = require('util');
const cloneDeep = (record)=>{
        let val = {};
        for (const [key, value] of Object.entries(record)) {
          val[key] = value;
        }
        return val;
};

/**
 * Update One Record
 *
 * An API call to update a model instance with the specified `id`,
 * treating the other unbound parameters as attributes.
 *
 * @param {Integer|String} id  - the unique id of the particular record you'd like to update  (Note: this param should be specified even if primary key is not `id`!!)
 * @param *                    - values to set on the record
 *
 */
module.exports = function updateOneRecord (req, res) {

  // Look up the model
  const Model = actionUtil.parseModel(req);

  // Locate and validate the required `id` parameter.
  const pk = actionUtil.requirePk(req);

  // Create `values` object (monolithic combination of all parameters)
  // But omit the blacklisted params (like JSONP callback param, etc.)
  const values = actionUtil.parseValues(req);

  // Omit the path parameter `id` from values, unless it was explicitly defined
  // elsewhere (body/query):
  const idParamExplicitlyIncluded = ((req.body && req.body.id) || req.query.id);
  if (!idParamExplicitlyIncluded) delete values.id;

  // No matter what, don't allow changing the PK via the update blueprint
  // (you should just drop and re-add the record if that's what you really want)
  if (typeof values[Model.primaryKey] !== 'undefined') {
    req._sails.log.warn('Cannot change primary key via update blueprint; ignoring value sent for `' + Model.primaryKey + '`');
  }
  delete values[Model.primaryKey];

  // Find and update the targeted record.
  //
  // (Note: this could be achieved in a single query, but a separate `findOne`
  //  is used first to provide a better experience for front-end developers
  //  integrating with the blueprint API.)
  Model.findByPk(pk).then( (matchingRecord) => {

    if (!matchingRecord) return res.notFound();

    Model.update(values, { where: { id: pk }}).then( (records) => {
      // Because this should only update a single record and update
      // returns an array, just use the first item.  If more than one
      // record was returned, something is amiss.
      if (!records || !records.length || records.length > 1) {
        req._sails.log.warn(util.format('Unexpected output from `%s.update`.', Model.globalId));
      }

      const updatedRecord = pk;

      // If we have the pubsub hook, use the Model's publish method
      // to notify all subscribers about the update.
      if (req._sails.hooks.pubsub) {
        if (req.isSocket) { Model.subscribe(req, records); }
        Model.publishUpdate(pk, cloneDeep(values), !req.options.mirror && req, {
          previous: cloneDeep(matchingRecord.toJSON())
        });
      }

      // Do a final query to populate the associations of the record.
      //
      // (Note: again, this extra query could be eliminated, but it is
      //  included by default to provide a better interface for integrating
      //  front-end developers.)
      Model.findByPk(updatedRecord, {include: req._sails.config.blueprints.populate ? [{ all: true }] : []})
      .then( (populatedRecord) => {
        if (!populatedRecord) return res.serverError('Could not find record after updating!');
        res.ok(populatedRecord);
      }).catch( (err) => {
        return res.serverError(err);
      }); // </foundAgain>
    }).catch( (err) => {
      // Differentiate between waterline-originated validation errors
      // and serious underlying issues. Respond with badRequest if a
      // validation error is encountered, w/ validation info.
      return res.negotiate(err);
    });
  }).catch( (err) => {
    return res.serverError(err);
  });
};
