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
 * Find Records
 *
 *  get   /:modelIdentity
 *   *    /:modelIdentity/find
 *
 * An API call to find and return model instances from the data adapter
 * using the specified criteria.  If an id was specified, just the instance
 * with that unique id will be returned.
 *
 * There are four parameters associated with pagination: limit, skip, page
 * and perPage. They are meant to be used only in pairs of {limit, skip}
 * or {page, perPage}. If the latter pair is specified, then it is used.
 *
 * Optional:
 * @param {Object} where       - the find criteria (passed directly to the ORM)
 * @param {Integer} limit      - the maximum number of records to send back (useful for pagination)
 * @param {Integer} skip       - the number of records to skip (useful for pagination)
 * @param {Integer} page       - the page number to use when limiting records to send back using perPage (useful for pagination)
 * @param {Integer} perPage    - the maximum number of records to send back (useful for pagination)
 * @param {String} sort        - the order of returned records, e.g. `name ASC` or `age DESC`
 * @param {String} callback - default jsonp callback param (i.e. the name of the js function returned)
 */

module.exports = function findRecords (req, res) {
  // Look up the model
 const parseBlueprintOptions = req.options.parseBlueprintOptions || req._sails.config.blueprints.parseBlueprintOptions;
  sails.log.debug('BluePrint find.js =/=\=/=\= req.options', req.options);
  // Set the blueprint action for parseBlueprintOptions.
  req.options.blueprintAction = 'find';

  const queryOptions = parseBlueprintOptions(req);
  const Model = req._sails.models[queryOptions.using];

  let limit = actionUtil.parseLimit(req),
      offset = actionUtil.parseSkip(req);

  const page = actionUtil.parsePage(req),
        perPage = actionUtil.parsePerPage(req),
        populate = actionUtil.populateEach(req);

  if(page && perPage){
    limit = perPage;
    offset = (page - 1) * (perPage + 1);
  }
  // If an `id` param was specified, use the findOne blueprint action
  // to grab the particular instance with its primary key === the value
  // of the `id` param.   (mainly here for compatibility for 0.9, where
  // there was no separate `findOne` action)
  if ( actionUtil.parsePk(req) ) {
    return require('./findOne')(req,res);
  }
  // Lookup for records that match the specified criteria
  Model.findAll({
    where: actionUtil.parseCriteria(req),
    limit: limit,
    offset: offset,
    order: actionUtil.parseSort(req),
    include: req._sails.config.blueprints.populate ?
             (isEmpty(populate) ? [{ all : true}] : populate) : []
  }).then( (matchingRecords) => {
    // Only `.watch()` for new instances of the model if
    // `autoWatch` is enabled.
    if (req._sails.hooks.pubsub && req.isSocket) {
      Model.subscribe(req, matchingRecords);
      if (req.options.autoWatch) { Model.watch(req); }
      // Also subscribe to instances of all associated models
      for(let i=0, record, l=matchingRecords.length;i<l;i++){
        record = matchingRecords[i];
        actionUtil.subscribeDeep(req, record);
      }
    }

    return res.ok(matchingRecords);
  }).catch( (err) => {
    return res.serverError(err);
  });
};
