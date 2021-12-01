/**
 * Module dependencies
 */
const actionUtil = require('../actionUtil');
const isEmpty = (obj) =>{
        // null and undefined are "empty"
        if (obj == null ) return true;
        const typ = typeof obj;
        // boolean never empty
        if (typ === 'boolean' || (typ === 'number' &&  !isNaN(obj))) return false;
        // Assume if it has a length property with a non-zero value
        // that that property is correct.
        if (obj.length > 0)    return false;
        if (obj.length === 0)  return true;
        // If it isn't an object at this point
        // it is empty, but it can't be anything *but* empty
        // Is it empty?  Depends on your application. 
        if (typ !== 'object') return true;
        // Speed up calls to hasOwnProperty
        // Otherwise, does it have any properties of its own?
        // Note that this doesn't handle
        // toString and valueOf enumeration bugs in IE < 9
        for (let key in obj) {
          if(obj.hasOwnProperty(key)) return false;
        }
        return true;
};
/**
 * Find One Record
 *
 * get /:modelIdentity/:id
 *
 * An API call to find and return a single model instance from the data adapter
 * using the specified id.
 *
 * Required:
 * @param {Integer|String} id  - the unique id of the particular instance you'd like to look up *
 *
 * Optional:
 * @param {String} callback - default jsonp callback param (i.e. the name of the js function returned)
 */

module.exports = function findOneRecord (req, res) {
  const Model = actionUtil.parseModel(req);
  const pk = actionUtil.requirePk(req);
  const populate = actionUtil.populateEach(req);
  sails.log.debug('BluePrint findOne.js =/=\=/=\= req.options', req.options);

  Model.findOne({where:{id:pk}, include: req._sails.config.blueprints.populate ?
                               (isEmpty(populate) ? [{ all : true}] : populate) : []
  }).then( (matchingRecord) => {
    if(!matchingRecord) return res.notFound('No record found with the specified `id`.');

    if (req._sails.hooks.pubsub && req.isSocket) {
      Model.subscribe(req, matchingRecord);
      actionUtil.subscribeDeep(req, matchingRecord);
    }

    res.ok(matchingRecord);
  }).catch( (err) => {
    return res.serverError(err);
  });

};
