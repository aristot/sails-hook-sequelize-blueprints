/**
 * Module dependencies
 */

const util = require('util'),
      _ = require('@sailshq/lodash'),
      flaverr = require('flaverr');
/**
 * parseBlueprintOptions()
 *
 * Parse information from the request for use in a blueprint action.
 *
 * > This is just the default implementation -- it can be overridden.
 * > See http://sailsjs.com/config/blueprints for more information.
 *
 * | Term                  | Meaning
 * |:----------------------|:----------------------------------------------------------------------------------------|
 * | route option          | e.g. `model`, `alias`, `parseBlueprintOptions`, `action`, etc. (+ non-standard options)
 * | query key             | e.g. `criteria`, `newRecord`, `valuesToSet`, `meta`, `using`, etc. (fully standardized)
 * | blueprint option      | e.g. `criteria`, `newRecord`, `valuesToSet`, `meta`, `using`, etc. (fully standardized)
 *
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 * @param {Request} req
 *
 * @returns {Dictionary}
 *          The final dict of "blueprint options"; special settings that
 *          tell a blueprint action what to do when it runs.  
 * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
 */

module.exports = function parseBlueprintOptions(req) {
  const extras = ['limit', 'skip', 'sort', 'populate', 'select', 'omit'];
  function cleanWhere(clause){
    let where = {};
    for (const k in clause){
      if( clause.hasOwnProperty( k ) ) {
        if(extras.indexof(k) !== -1) continue;
        if(!clause[k])continue;
        where[k] = clause[k];
      }
    }
    return where;
  }

  // Set some defaults.
  const DEFAULT_LIMIT = 30;

  // Get the name of the blueprint action being run.
  const blueprint = req.options.blueprintAction;
  sails.log.debug('parse-blue_options blueprint =+=+=+=+=+ >>>>>> :', blueprint);
  // Get the model identity from the action name (e.g. 'user/find').
  const model = req.options.action.split('/')[0];
  if (!model) { throw new Error(util.format('No "model" specified in route options.')); }

  // Get the model class.
  const Model = req._sails.models[model];
  if ( !Model ) { throw new Error(util.format('Invalid route option, "model".\nI don\'t know about any models named: `%s`',model)); }
  // Get the default populates array
  let defaultPopulates ={};

  // Initialize the queryOptions dictionary we'll be returning.
  let queryOptions = { using: model, populates: defaultPopulates };

  switch (blueprint) {

    case 'find':
    case 'findOne':

      queryOptions.criteria = {};

      queryOptions.criteria.where = (function getWhereCriteria(){
        let where = {};
        // For `findOne`, set "where" to just look at the primary key.
        if (blueprint === 'findOne') {
          where[Model.primaryKey] = req.param('id');
          return where;
        }
        // Look for explicitly specified `where` parameter.
        where = req.allParams().where;
        // If `where` parameter is a string, try to interpret it as JSON.
        // (If it cannot be parsed, throw a UsageError.)
        if (typeof where === 'string') {
          try {
            where = JSON.parse(where);
          } catch (e) {
            throw flaverr({ name: 'UsageError' }, new Error('Could not JSON.parse() the provided `where` clause. Here is the raw error: '+e.stack));
          }
        }

        // If `where` has not been specified, but other unbound parameter variables
        // **ARE** specified, build the `where` option using them.
        if (!where) {
          // Prune params which aren't fit to be used as `where` criteria
          // to build a proper where query
          // Omit built-in runtime config (like query modifiers)
          // Omit any params that have `undefined` on the RHS.
          where = cleanWhere(req.allParams());
        }
        // Return final `where`.
        return where;
      })();

      if (req.param('select')) {
        queryOptions.criteria.select = req.param('select').split(',').map((attribute) => {return attribute.trim();});
      } else if (req.param('omit')) {
        queryOptions.criteria.omit = req.param('omit').split(',').map((attribute) => {return attribute.trim();});
      }

      if (req.param('limit')) {
        queryOptions.criteria.limit = req.param('limit');
      } else {
        queryOptions.criteria.limit = DEFAULT_LIMIT;
      }

      if (req.param('skip')) { queryOptions.criteria.skip = req.param('skip'); }

      if (req.param('sort')) {
        queryOptions.criteria.sort = (function getSortCriteria() {
          let sort = req.param('sort');
          if (!sort)return undefined;
          // If `sort` is a string, attempt to JSON.parse() it.
          // (e.g. `{"name": 1}`)
          if (typeof sort === 'string') {
            try {
              sort = JSON.parse(sort);
              // If it is not valid JSON (e.g. because it's just some other string),
              // then just fall back to interpreting it as-is (e.g. "name ASC")
            } catch(unusedErr) {}
          }
          return sort;
        })();
      }
      // If a `populate` param was sent, filter the attributes to populate
      // against that value.
      // e.g.:
      //   /model?populate=alias1,alias2,alias3
      //   /model?populate=[alias1,alias2,alias3]
      if (req.param('populate')) {

        queryOptions.populates = (function getPopulates() {
          // Get the request param.
          let attributes = req.param('populate');
          // If it's `false`, populate nothing.
          if (attributes === 'false')return {};
          // Split the list on commas.
          let attrs = attributes.split(',');
          attributes = {};
          // Trim whitespace off of the attributes.
          for (let i = 0, attr, l = attrs.length; i<l;i++){
            attr = attrs[i].trim();
            attributes[attr] = {};
          }
          return attributes;
        })();
      }

      break;
    case 'create':
      // Set `fetch: true`
      queryOptions.meta = { fetch: true };

      queryOptions.newRecord = (function getNewRecord(){
        // Use all of the request params as values for the new record.
        const values = req.allParams();
        return values;

      })();
      break;
    case 'update':

      queryOptions.criteria = {where: {}};

      queryOptions.criteria.where[Model.primaryKey] = req.param('id');

      // Set `fetch: true`
      queryOptions.meta = { fetch: true };

      queryOptions.valuesToSet = (function getValuesToSet(){

        // Use all of the request params as values for the new record, _except_ `id`.
        let values = _.omit(req.allParams(), 'id');
        // No matter what, don't allow changing the PK via the update blueprint
        // (you should just drop and re-add the record if that's what you really want)
        if (typeof values[Model.primaryKey] !== 'undefined' && values[Model.primaryKey] !== queryOptions.criteria.where[Model.primaryKey]) {
          req._sails.log.warn('Cannot change primary key via update blueprint; ignoring value sent for `' + Model.primaryKey + '`');
        }
        // Make sure the primary key is unchanged
        values[Model.primaryKey] = queryOptions.criteria.where[Model.primaryKey];

        return values;

      })();

      break;
    case 'destroy':

      queryOptions.criteria = { where: {} };

      queryOptions.criteria.where[Model.primaryKey] = req.param('id');

      // Set `fetch: true`
      queryOptions.meta = { fetch: true };

      break;
    case 'add':
    case 'remove':
      if (!req.options.alias) {
        throw new Error('Missing required route option, `req.options.alias`.');
      }
      queryOptions.alias = req.options.alias;

      queryOptions.targetRecordId = req.param('parentid');

      queryOptions.associatedIds = [req.param('childid')];

      break;

    case 'populate':

      if (!req.options.alias) {
        throw new Error('Missing required route option, `req.options.alias`.');
      }

      const association = _.find(Model.associations, {alias: req.options.alias});
      if (!association) {
        throw new Error('Consistency violation: `populate` blueprint could not find association `' + req.options.alias + '` in model `' + Model.globalId + '`.');
      }
      queryOptions.alias = req.options.alias;
      queryOptions.criteria = { where: {} };
      queryOptions.criteria.where[Model.primaryKey] = req.param('parentid');
      queryOptions.populates = {};
      queryOptions.populates[req.options.alias] = {};
      let qPopulate = queryOptions.populates[req.options.alias];
      // If this is a to-many association, add a `where` clause.
      if (association.collection) {
        qPopulate.where = (function getPopulateCriteria(){

          let where = req.allParams().where;

          // If `where` parameter is a string, try to interpret it as JSON.
          // (If it cannot be parsed, throw a UsageError.)
          if (typeof where === 'string') {
            try {
              where = JSON.parse(where);
            } catch (e) {
              throw flaverr({ name: 'UsageError' }, new Error('Could not JSON.parse() the provided `where` clause. Here is the raw error: '+e.stack));
            }
          }
          // If `where` has not been specified, but other unbound parameter variables
          // **ARE** specified, build the `where` option using them.
          if (!where) {
            // Prune params which aren't fit to be used as `where` criteria
            // to build a proper where query
            // Omit built-in runtime config (like query modifiers)
            // Omit any params that have `undefined` on the RHS.
            where = cleanWhere(req.allParams());
          }
          // Return final `where`.
          return where;

        })();
      }

      if (req.param('select')) {
        qPopulate.select = req.param('select').split(',').map((attribute) => {return attribute.trim();});
      } else if (req.param('omit')) {
        qPopulate.omit = req.param('omit').split(',').map((attribute) => {return attribute.trim();});
      }

      if (req.param('limit')) {
        qPopulate.limit = req.param('limit');
      } else if (association.collection) {
        qPopulate.limit = DEFAULT_LIMIT;
      }
      if (req.param('skip')) { qPopulate.skip = req.param('skip'); }
      if (!req.param('sort')) {
        qPopulate.sort = (function getSortCriteria() {
          let sort = req.param('sort');
          if (!sort)return undefined;
          // If `sort` is a string, attempt to JSON.parse() it.
          // (e.g. `{"name": 1}`)
          if (typeof sort === 'string') {
            try {
              sort = JSON.parse(sort);
              // If it is not valid JSON (e.g. because it's just a normal string),
              // then fall back to interpreting it as-is (e.g. "fullName ASC")
            } catch(unusedErr) {}
          }
          return sort;
        })();//ˆ
      }
      break;

  }

  return queryOptions;
};
