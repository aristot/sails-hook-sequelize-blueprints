/**
 * Module dependencies
 */
const _ = require('@sailshq/lodash')
  , util = require('util')
  , pluralize = require('pluralize')
  , flaverr = require('flaverr')
  , BlueprintController = {
      create  : require('./actions/create')
    , find    : require('./actions/find')
    , findone : require('./actions/findOne')
    , update  : require('./actions/update')
    , destroy : require('./actions/destroy')
    , populate: require('./actions/populate')
    , add     : require('./actions/add')
    , remove  : require('./actions/remove')
  }
  , STRINGFILE = require('sails-stringfile');


/**
 * Blueprints (Core Hook)
 *
 * Stability: 1 - Experimental
 * (see http://nodejs.org/api/documentation.html#documentation_stability_index)
 */

module.exports = function(sails) {

  /**
   * Private dependencies.
   * (need access to `sails`)
   */

  const onRoute = require('./onRoute')(sails);

  var hook;

  /**
   * Expose blueprint hook definition
   */
  return {

    /**
     * Default configuration to merge w/ top-level `sails.config`
     * @type {Object}
     */
    defaults: {

      // These config options are mixed into the route options (req.options)
      // and made accessible from the blueprint actions.  Most of them currently
      // relate to the shadow (i.e. implicit) routes which are created, and are
      // interpreted by this hook.
      blueprints: {
        // Blueprint/Shadow-Routes Enabled
        //
        // e.g. '/frog/jump': 'FrogController.jump'
        actions: true,
        // e.g. '/frog': 'FrogController.index'
        index: false,
        // e.g. '/frog/find/:id?': 'FrogController.find'
        shortcuts: true,
        // e.g. 'get /frog/:id?': 'FrogController.find'
        rest: true,
        // Blueprint/Shadow-Route Modifiers
        //
        // e.g. 'get /api/v2/frog/:id?': 'FrogController.find'
        prefix: '',
        // Blueprint/REST-Route Modifiers
        // Will work only for REST and will extend `prefix` option
        //
        // e.g. 'get /api/v2/frog/:id?': 'FrogController.find'
        restPrefix: '',
        // e.g. 'get /frogs': 'FrogController.find'
        pluralize: false,
        // Configuration of the blueprint actions themselves:
        // Whether to populate all association attributes in the `find`
        // blueprint action.
        populate: true,
        // Whether to run `Model.watch()` in the `find` blueprint action.
        autoWatch: true,
        // Private per-controller config.
        _controllers: {},

        parseBlueprintOptions: function(req) {
          return req._sails.hooks['sequelize-blueprints'].parseBlueprintOptions(req);
        }
      }

  },

  configure: function() {

      if (sails.config.blueprints.jsonp) {
        throw flaverr({ name: 'userError', code: 'E_JSONP_UNSUPPORTED' }, new Error('JSONP support was removed from the blueprints API in Sails 1.0 (detected sails.config.blueprints.jsonp === '  + sails.config.blueprints.jsonp + ')'));
      }

      if (sails.config.blueprints.defaultLimit) {
        sails.log.debug('The `sails.config.blueprints.defaultLimit` option is no longer supported in Sails 1.0.');
        sails.log.debug('Instead, you can use a `parseBlueprintOptions` function to fully customize blueprint behavior.');
        sails.log.debug('See http://sailsjs.com/docs/reference/configuration/sails-config-blueprints#?using-parseblueprintoptions.');
        sails.log.debug('(Setting the default limit to 30 in the meantime.)');
        sails.log.debug();
      }

      if (sails.config.blueprints.populate) {
        sails.log.debug('The `sails.config.blueprints.populate` option is no longer supported in Sails 1.0.');
        sails.log.debug('Instead, you can use a `parseBlueprintOptions` function to fully customize blueprint behavior.');
        sails.log.debug('See http://sailsjs.com/docs/reference/configuration/sails-config-blueprints#?using-parseblueprintoptions.');
        sails.log.debug('(Will populate all associations in blueprints in the meantime.)');
        sails.log.debug();
      }

    },

    parseBlueprintOptions: require('./parse-blueprint-options'),

    _actions: {},

    /**
     * Initialize is fired first thing when the hook is loaded.
     *
     * @param  {Function} cb
     */
    initialize: function (cb) {

      // Provide hook context to closures
      hook = this;
      hook.config = Object.assign({}, this.defaults.blueprints, sails.config.blueprints);
      // Set the _middlewareType of each blueprint action to 'BLUEPRINT: <action>'.      
      _.each(BlueprintController, (fn, key) => {
        fn._middlewareType = 'BLUEPRINT: ' + key;
      });
      // Register route syntax for binding blueprints directly.
      sails.on('route:typeUnknown', onRoute);
      // Register route syntax for binding blueprints directly.
      // This is deprecated, so onRoute currently just logs a warning.
      // Wait until after user routes have been bound to bind our
      // own "shadow routes" (action routes, RESTful routes,
      // shortcut routes and index routes).
      sails.on('router:after', hook.bindShadowRoutes);            
      // If the ORM hook is active, wait for it to load, then create actions
      // for each model.
      if (sails.hooks.sequelize) {
        sails.after('hook:sequelize:loaded', () => {
          hook.registerActions(cb);
        });
      }
      // Otherwise we're done!
      else {
        return cb();
      } 
 
    },

    bindShadowRoutes: function() {

      let config = sails.config.blueprints || {};
      sails.log.debug('BLUE PRINT +++++++bindShadowRoutes++++++++this.config : ', this.config);      
      sails.log.debug('BLUE PRINT +++++++bindShadowRoutes++++++++config : ', config);
      // Validate blueprint config for this controller
      if ( config.prefix ) {
        if ( typeof config.prefix !== 'string' ) {
          sails.after('lifted', () => {
            sails.log.blank();
            sails.log.warn('`prefix` should be a string, e.g. "/api/v1".');
            STRINGFILE.logMoreInfoLink(STRINGFILE.get('links.docs.config.blueprints'), sails.log.warn);
          });
          return;
        }
        if ( !config.prefix.match(/^\//) ) {
          const originalPrefix = config.prefix;
          sails.after('lifted', () => {
            sails.log.blank();
            sails.log.warn(util.format('Invalid blueprint prefix ("%s") configured for controller (should start with a `/`).', originalPrefix));
            sails.log.warn(util.format('For now, assuming you meant:  "%s".', config.prefix));
            STRINGFILE.logMoreInfoLink(STRINGFILE.get('links.docs.config.blueprints'), sails.log.warn);
          });

          config.prefix = '/' + config.prefix;
        }
      }

      // Validate REST route blueprint config for this controller
      if ( config.restPrefix ) {
        if ( typeof config.restPrefix !== 'string' ) {
          sails.after('lifted',() => {
            sails.log.blank();
            sails.log.warn(util.format('Ignoring invalid blueprint rest prefix configured for controller '));
            sails.log.warn('`restPrefix` should be a string, e.g. "/api/v1".');
            STRINGFILE.logMoreInfoLink(STRINGFILE.get('links.docs.config.blueprints'), sails.log.warn);
          });
          return;
        }
        if ( !config.restPrefix.match(/^\//) ) {
          const originalRestPrefix = config.restPrefix;
          sails.after('lifted', () => {
            sails.log.blank();
            sails.log.warn(util.format('Invalid blueprint restPrefix ("%s") configured for controller  (should start with a `/`).', originalRestPrefix));
            sails.log.warn(util.format('For now, assuming you meant:  "%s".', config.restPrefix));
            STRINGFILE.logMoreInfoLink(STRINGFILE.get('links.docs.config.blueprints'), sails.log.warn);
          });

          config.restPrefix = '/' + config.restPrefix;
        }
      }
      // Get a copy of the Sails actions dictionary.
      const actions = sails.getActions();
      // Determine whether any model is using the default archive model.
      const defaultArchiveInUse = _.any(sails.models, (model) => { return model.archiveModelIdentity === 'archive'; });
      // If action routing is turned on, bind a route pointing
      // at each action in the Sails actions dictionary

      if ( config.actions ) {
        sails.log.debug('BLUE PRINT +++++++bindShadowRoutes++++++++  ACTIONS ++++++++++');

        // Loop through each action in the dictionary
        _.each(actions, (action, key) =>  {
          // If this is a blueprint action, only skip it.
          // It'll be handled in the "shortcut routes" section,
          // if those routes are enabled.
          if (action._middlewareType && action._middlewareType.indexOf('BLUEPRINT') === 0)return;
          // If this action belongs to a controller with blueprint action routes turned off, skip it.
          if (_.any(config._controllers, function(config, controllerIdentity) {return config.actions === false && key.indexOf(controllerIdentity) === 0;}))return;
          // Add the route prefix (if any) and bind the route to that URL.
          const url = config.prefix + '/' + key;
          sails.router.bind(url, key);
        });
      }
      sails.log.debug('BLUE PRINT +++++++bindShadowRoutes++++++++  sails.hooks ++++++++++',sails.hooks);

      if (sails.hooks.orm || !sails.hooks.sequelize || !sails.models )return;
      // If shortcut blueprint routing is turned on, bind CRUD routes
      // for each model using GET-only urls.
      if ( !config.shortcuts ) {
        sails.log.debug('BLUE PRINT +++++++bindShadowRoutes++++++++  SHORTCUTS ++++++++++');
        // Loop through each model.
        _.each(sails.models, (Model, identity) => {

          if (identity === 'archive' && defaultArchiveInUse)return;
          // If this there is a matching controller with blueprint shortcut routes turned off, skip it.
          if (_.any(config._controllers, (config, controllerIdentity) => {return config.shortcuts === false && identity === controllerIdentity;})) return;
          // Determine the base route for the model.
          const baseShortcutRoute = (function() {
            // Start with the model identity.
            let baseRouteName = identity;
            // Pluralize it if plurization option is on.
            if (config.pluralize)baseRouteName = pluralize(baseRouteName);
            // Add the route prefix and base route name together.
            return config.prefix + '/' + baseRouteName;
          })();

          _bindShortcutRoute('get %s/find', 'find');
          _bindShortcutRoute('get %s/find/:id', 'findOne');
          _bindShortcutRoute('get %s/create', 'create');
          _bindShortcutRoute('get %s/update/:id', 'update');
          _bindShortcutRoute('get %s/destroy/:id', 'destroy');

          // Bind "rest" blueprint/shadow routes based on known associations in our model's schema
          // Bind add/remove for each `collection` associations
          _.mapKeys(Model.associations, (value) => {
              const foreign = typeof value === 'object' && value.options ? value.options.foreignKey : undefined;
              let   alias;
              if (!foreign)alias =  value.as;
               else alias = foreign.as || foreign.name || foreign;
               sails.log.debug('Binding "shortcuts" to association blueprint -=-=-> `'+alias+'` for',value);
               
               _bindAssocRoute('%s/:parentid/%s/add/:id?', 'add', alias);
               _bindAssocRoute( '%s/:parentid/%s/remove/:id?', 'remove', alias);              
          });
      
          function _bindShortcutRoute(template, blueprintActionName) {
            // Get the route URL for this shortcut
            const shortcutRoute = util.format(template, baseShortcutRoute);
            // Bind it to the appropriate action, adding in some route options including a deep clone of the model associations.
            // The clone prevents the blueprint action from accidentally altering the model definition in any way.
            sails.router.bind(shortcutRoute, identity + '/' + blueprintActionName, null, { model: identity, associations: _.cloneDeep(Model.associations), autoWatch: sails.config.blueprints.autoWatch });
          }
          function _bindAssocRoute(template, blueprintActionName, alias) {
            // Get the route URL for this shortcut
            const assocRoute = util.format(template, baseShortcutRoute, alias);
            // Bind it to the appropriate action, adding in some route options including a deep clone of the model associations.
            // The clone prevents the blueprint action from accidentally altering the model definition in any way.
            sails.router.bind(assocRoute, identity + '/' + blueprintActionName, null, { model: identity, alias: alias, associations: _.cloneDeep(Model.associations), autoWatch: sails.config.blueprints.autoWatch  });
          }
        });
      }

      // If RESTful blueprint routing is turned on, bind CRUD routes
      // for each model.
      if ( config.rest ) {
        // Loop throug each model.
        sails.log.debug('BLUE PRINT +++++++bindShadowRoutes++++++++  RESTFULL ++++++++++');
        
        _.each(sails.models, (Model, identity) => {

          if (identity === 'archive' && defaultArchiveInUse)return;
          // If this there is a matching controller with blueprint shortcut routes turned off, skip it.
          if (_.any(config._controllers, (config, controllerIdentity) => {return config.rest === false && identity === controllerIdentity;}))return;
          // Determine the base REST route for the model.
          const baseRestRoute = (function() {
              // Start with the model identity.
              let baseRouteName = identity;
              // Pluralize it if plurization option is on.
              if (config.pluralize)baseRouteName = pluralize(baseRouteName);
              // Add the route prefix, RESTful route prefix and base route name together.
              return config.prefix + config.restPrefix + '/' + baseRouteName;
          })();

          _bindRestRoute('get %s', 'find');
          _bindRestRoute('get %s/:id', 'findOne');
          _bindRestRoute('post %s', 'create');
          _bindRestRoute('patch %s/:id', 'update');
          _bindRestRoute('delete %s/:id?', 'destroy');

          // Bind the `put :model/:id` route to the update action, first bind a route that
          // logs a warning about using `PUT` instead of `PATCH`.
          // Some route options are set as well, including a deep clone of the model associations.
          // The clone prevents the blueprint action from accidentally altering the model definition in any way.
          sails.router.bind(
            util.format('put %s/:id', baseRestRoute),
            function (req, res, next) {
              sails.log.debug('Using `PUT` to update a record is deprecated in Sails 1.0.  Use `PATCH` instead!');
              return next();
            }
          );
          _bindRestRoute('put %s/:id', 'update');
            // Bind "rest" blueprint/shadow routes based on known associations in our model's schema
            // Bind add/remove for each `collection` associations
          _.mapKeys(Model.associations, function(value){
              const foreign = typeof value === 'object' && value.options ? value.options.foreignKey : undefined;
              let    alias;
              if (!foreign)alias =  value.as;
                else  alias = foreign.as || foreign.name || foreign;
              sails.log.debug('Binding "rest" to association blueprint -=-=-> `'+alias+'` for',value);
                
              _bindAssocRoute('post %s/:parentid/%s/:id?', 'add', alias);
              _bindAssocRoute('delete %s/:parentid/%s/:id?', 'remove', alias);
          });

          // and populate for both `collection` and `model` associations
          _.mapKeys(Model.associations, function(value){
              const foreign = typeof value === 'object' && value.options ? value.options.foreignKey : undefined;
              let    alias;
              if (!foreign)alias =  value.as;
              else alias = foreign.as || foreign.name || foreign;
              _bindAssocRoute('get %s/:parentid/%s', 'populate', alias );
 
          });
          function _bindRestRoute(template, blueprintActionName) {
            // Get the URL for the RESTful route
            const restRoute = util.format(template, baseRestRoute);
            // Bind it to the appropriate action, adding in some route options including a deep clone of the model associations.
            // The clone prevents the blueprint action from accidentally altering the model definition in any way.
            sails.router.bind(restRoute, identity + '/' + blueprintActionName, null, { model: identity, associations: _.cloneDeep(Model.associations), autoWatch: sails.config.blueprints.autoWatch  });
          }

          function _bindAssocRoute(template, blueprintActionName, alias) {
            // Get the URL for the RESTful route
            const assocRoute = util.format(template, baseRestRoute, alias);
            // Bind it to the appropriate action, adding in some route options including a deep clone of the model associations.
            // The clone prevents the blueprint action from accidentally altering the model definition in any way.
            sails.router.bind(assocRoute, identity + '/' + blueprintActionName, null, { model: identity, alias: alias, associations: _.cloneDeep(Model.associations), autoWatch: sails.config.blueprints.autoWatch  });
          }

        });
      }
      if ( config.actions ) {
        // Loop through each action in the dictionary
        _.each(actions, (action, key) => {
          // Does the key end in `/index` (or is it === `index`)?
          if (key === 'index' || key.match(/\/index$/)) {
            // If this action belongs to a controller with blueprint action routes turned off, skip it.
            if (_.any(config._controllers, (config, controllerIdentity) => {return config.actions === false && key.indexOf(controllerIdentity) === 0;})) return;
            // Strip the `.index` off the end.
            const index = key.replace(/\/?index$/,'');
            // Replace any remaining dots with slashes.
            const url = '/' + index;
            // Bind the url to the action.
            sails.router.bind(url, key);
          }
        });
      }
    },

    registerActions: function(cb) {
      // Determine whether or not any model is using the default archive.
      const defaultArchiveInUse = _.any(sails.models, (model) => { return model.archiveModelIdentity === 'archive'; });

      // Loop through all of the loaded models and add actions for each.
      // Even though we're adding the same exact actions for each model,
      // (e.g. user/find and pet/find are the same), it's important that
      // each model gets its own set so that they can have different
      // action middleware (e.g. policies) applied to them.
      _.each(_.keys(sails.models), (modelIdentity) => {

        if (modelIdentity === 'archive' && defaultArchiveInUse)return;

        sails.registerAction(BlueprintController.create, modelIdentity + '/create');
        sails.registerAction(BlueprintController.find, modelIdentity + '/find');
        sails.registerAction(BlueprintController.findone, modelIdentity + '/findOne');
        sails.registerAction(BlueprintController.update, modelIdentity + '/update');
        sails.registerAction(BlueprintController.destroy, modelIdentity + '/destroy');
        sails.registerAction(BlueprintController.populate, modelIdentity + '/populate');
        sails.registerAction(BlueprintController.add, modelIdentity + '/add');
        sails.registerAction(BlueprintController.remove, modelIdentity + '/remove');
      });
      return cb();
    }

  };

};