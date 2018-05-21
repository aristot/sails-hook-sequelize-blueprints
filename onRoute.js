
// NOTE:
// Since controllers load blueprint actions by default anyways, this route syntax handler
// can be replaced with `{action: 'find'}, {action: 'create'}, ...` etc.


/**
 * Expose route parser.
 * @type {Function}
 */
module.exports = function(sails) {

  /**
   * interpretRouteSyntax
   *
   * "Teach" router to understand direct references to blueprints
   * as a target to sails.router.bind()
   * (i.e. in the `routes.js` file)
   *
   * @param  {[type]} route [description]
   * @return {[type]}       [description]
   * @api private
   */
  return function interpretRouteSyntax(route) {
    var target = route.target;

    if (typeof target === 'function') {
      throw new Error('Consistency violation: route target is a function, but is being handled by blueprint hook instead of Sails router!');
    }

    if (Array.isArray(target)) {
      throw new Error('Consistency violation: route target is an array, but is being handled by blueprint hook instead of Sails router!');
    }

    if (!target || typeof target !== 'object') {
      throw new Error('Consistency violation: route target is a ' + typeof(target) + ', but is being handled by blueprint hook instead of Sails router!');
    }

    // Support referencing blueprints in explicit routes
    // (`{ blueprint: 'create' }` et. al.)
    if (target.blueprint) {

      var errMsg = 'The `blueprint` route target syntax is no longer supported.';
      if (typeof target.blueprint === 'string' && typeof target.model === 'string') {
        errMsg = ' Use {action: \'' + target.model.toLowerCase() + '.' + target.blueprint + '\'} instead!';
      }
      sails.log.error(errMsg);
      return;

    }

  };

};
