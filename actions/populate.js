/**
 * Module dependencies
 */
const util = require('util'),
      actionUtil = require('../actionUtil');
const has = (obj, path) => {
        // Regex explained: https://regexr.com/58j0k
        const pathArray = Array.isArray(path) ? path : path.match(/([^[.\]])+/g);
      
        return !!pathArray.reduce((prevObj, key) => prevObj && prevObj[key], obj);
};

/**
 * Populate (or "expand") an association
 *
 * get /model/:parentid/relation
 * get /model/:parentid/relation/:id
 *
 * @param {Integer|String} parentid  - the unique id of the parent instance
 * @param {Integer|String} id  - the unique id of the particular child instance you'd like to look up within this relation
 * @param {Object} where       - the find criteria (passed directly to the ORM)
 * @param {Integer} limit      - the maximum number of records to send back (useful for pagination)
 * @param {Integer} skip       - the number of records to skip (useful for pagination)
 * @param {String} sort        - the order of returned records, e.g. `name ASC` or `age DESC`
 *
 * @option {String} model  - the identity of the model
 * @option {String} alias  - the name of the association attribute (aka "alias")
 */

module.exports = function expand(req, res) {
  const Model = actionUtil.parseModel(req);
  const relation = req.options.alias;
  if (!relation || !Model) return res.serverError();
  function objCompact(obj, strict) {
    obj =  Object.entries(obj).reduce((memo, [value, paramName]) =>{
      if (strict) {
        if (value !== undefined && value !== null && value !== false && value !== '') {
          memo[paramName] = value;
        }
      } else if (value !== undefined) {
          memo[paramName] = value;
        }
        return memo;
       },{});
    return obj;
  }
  // Allow customizable blacklist for params.
  req.options.criteria = req.options.criteria || {};
  req.options.criteria.blacklist = req.options.criteria.blacklist || ['limit', 'skip', 'sort', 'id', 'parentid'];

  const parentPk = req.param('parentid');

  // Determine whether to populate using a criteria, or the
  // specified primary key of the child record, or with no
  // filter at all.
  let childPk = actionUtil.parsePk(req);

  // Coerce the child PK to an integer if necessary
  if (childPk) {
    if (Model.attributes[Model.primaryKeys.id.fieldName].type.toLowerCase() === 'integer') {
      childPk = +childPk || 0;
    }
  }

  const where = childPk ? {id: [childPk]} : actionUtil.parseCriteria(req);

  const populate = objCompact({
    as: relation,
    model: sails.models[req.options.target.toLowerCase()],
    order: actionUtil.parseSort(req),
    where: where
  });

  // Only get limit whether association type is HasMany
  if(Model.associations[relation].associationType === 'HasMany')
    populate.limit = actionUtil.parseLimit(req);

  Model.findByPk(parentPk, { include: [populate] })
  .then( (matchingRecord) => {
      if (!matchingRecord) {
        if(Model.associations[relation].associationType === 'BelongsToMany') {
          if (has(where, 'id')) return res.notFound('No record found with the specified id.');

          return res.send(200, []);
        } else {
          return res.notFound('No record found with the specified id.');
        }
      }
      if (!matchingRecord[relation]) return res.notFound(util.format('Specified record (%s) is missing relation `%s`', parentPk, relation));

      // Subcribe to instance, if relevant
      // TODO: only subscribe to populated attribute- not the entire model
      if (sails.hooks.pubsub && req.isSocket) {
        Model.subscribe(req, matchingRecord);
        actionUtil.subscribeDeep(req, matchingRecord);
      }
      return res.ok(matchingRecord[relation]);
    }).catch( (err) => {
      return res.serverError(err);
    });
};
