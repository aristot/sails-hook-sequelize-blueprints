/**
 * Module dependencies
 */
const actionUtil = require('../actionUtil');

/**
 * Destroy One Record
 *
 * delete  /:modelIdentity/:id
 *    *    /:modelIdentity/destroy/:id
 *
 * Destroys the single model instance with the specified `id` from
 * the data adapter for the given model if it exists.
 *
 * Required:
 * @param {Integer|String} id  - the unique id of the particular instance you'd like to delete
 *
 * Optional:
 * @param {String} callback - default jsonp callback param (i.e. the name of the js function returned)
 */
module.exports = function destroyOneRecord (req, res) {

  const Model = actionUtil.parseModel(req);
  const pk = actionUtil.requirePk(req);

  Model.findById(pk, { include: req._sails.config.blueprints.populate ? [{ all: true }] : []})
  .then( (record) => {
    if(!record) return res.notFound('No record found with the specified `id`.');

    Model.destroy({ where: { id: pk }}).then( () => {

      if (req._sails.hooks.pubsub) {
        Model.publishDestroy(pk, !req._sails.config.blueprints.mirror && req, {previous: record});
        if (req.isSocket) {
          Model.unsubscribe(req, record);
          Model.retire(record);
        }
      }

      return res.ok(record);
    }).catch( (err) => {
      return res.negotiate(err);
    });
  }).catch( (err) => {
    return res.serverError(err);
  });
};
