/**
 * Module dependencies
 */
const actionUtil = require('../actionUtil');
const has = (obj, path) => {
        // Regex explained: https://regexr.com/58j0k
        const pathArray = Array.isArray(path) ? path : path.match(/([^[.\]])+/g);
      
        return !!pathArray.reduce((prevObj, key) => prevObj && prevObj[key], obj);
};

/**
 * Remove a member from an association
 *
 * @param {Integer|String} parentid  - the unique id of the parent record
 * @param {Integer|String} id  - the unique id of the child record to remove
 *
 * @option {String} model  - the identity of the model
 * @option {String} alias  - the name of the association attribute (aka "alias")
 */

module.exports = function remove(req, res) {

  // Ensure a model and alias can be deduced from the request.
  const Model = actionUtil.parseModel(req);
  const relation = req.options.alias;
  if (!relation) {
    return res.serverError(new Error('Missing required route option, `req.options.alias`.'));
  }

  // The primary key of the parent record
  const parentPk = req.param('parentid');

  // Get the model class of the child in order to figure out the name of
  // the primary key attribute.
  const ChildModel = sails.models[req.options.target.toLowerCase()];
  const childPkAttr = ChildModel.primaryKeys.id.fieldName;

  // The primary key of the child record to remove
  // from the aliased collection
  const childPk = actionUtil.parsePk(req);
  let childRemove = {};
  childRemove[childPkAttr] = childPk;

  let isManyToManyThrough = false;
  let ThroughModel, childAttr; 
  // check it is a M-M through
  if (has(Model.associations[relation].options, 'through')) {
    isManyToManyThrough = true;
    const through = Model.associations[relation].options.through.model;
    ThroughModel = sails.models[through.toLowerCase()];
    const childRelation = Model.associations[relation].options.to;
    const childForeign = ChildModel.associations[childRelation].options.foreignKey;
    childAttr = childForeign.name || childForeign;
  }

  if(childPk === undefined) {
    return res.serverError('Missing required child PK.');
  }

  Model.findByPk(parentPk, { include: [{ all: true }]}).then( (parentRecord) => {
    if (!parentRecord) return res.notFound();
    if (!parentRecord[relation]) return res.notFound();

    if (isManyToManyThrough) {
      let throughRemove = { };
      throughRemove[childAttr] = childPk;
      ThroughModel.destroy({ where: throughRemove }).then( () => {
        return returnParentModel();
      })
      .catch((err) => {
        return res.negotiate(err);
      });
    } else { // not M-M
      ChildModel.destroy({ where: childRemove }).then( () =>{
        return returnParentModel();
      }).catch( (err) => {
        return res.negotiate(err);
      });
    }
  }).catch( (err) =>{
    return res.serverError(err);
  });

  function returnParentModel () {
    Model.findByPk(parentPk, { include: req._sails.config.blueprints.populate ? [{ all: true }] : [] })
    // .populate(relation)
    // TODO: use populateEach util instead
    .then( (parentRecord) => {
      if (!parentRecord) return res.serverError();
      if (!parentRecord[Model.primaryKeys.id.fieldName]) return res.serverError();

      // If we have the pubsub hook, use the model class's publish method
      // to notify all subscribers about the removed item
      if (sails.hooks.pubsub) {
        Model.publishRemove(parentRecord[Model.primaryKey], relation, childPk, !sails.config.blueprints.mirror && req);
      }

      return res.ok(parentRecord);
    }).catch( (err) => {
      return res.serverError(err);
    });
  }

};
