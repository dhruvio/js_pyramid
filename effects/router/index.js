
// TODO
// validate all routes
// documentation
// try code cleanup

// imports

const window        = require("global/window");
const pathToRegexp  = require("path-to-regexp");
const noop          = require("lodash/noop");
const isPlainObject = require("lodash/isPlainObject");
const isArray       = require("lodash/isArray");
const isBoolean     = require("lodash/isBoolean");
const log           = require("../../services/logger")("pyramid:effects:router");

const symbols = require("./symbols");

// export effect

module.exports = make;

// define effect

function make ({ routes, useHash = true }) {

  // validate arguments

  const options = arguments[0];
  let valid = true;

  if (!isPlainObject(options)) {
    log.error("options must be a plain object", { options });
    valid = false;
  }

  //TODO validate all routes specified individually as well
  if (!isArray(routes)) {
    log.error("options.routes must be an array", { routes });
    valid = false;
  }

  if (!isBoolean(useHash)) {
    log.error("options.useHash must be a boolean", { useHash });
    valid = false;
  }

  // if validation fails, exit early and provide empty effect
  if (!valid) {
    log.error("effect creation's validation failed, returning no-op effect");
    return noop;
  }

  // cache regular expressions on routes
  routes.forEach(route => {
    route.keys = [];
    route.regexp = pathToRegexp(route.pattern, route.keys);
  });

  // return effect handler

  return function (state, update) {

    // initialize the router state if necessary
    // and abort
    const initialized = state.get(symbols.STATE_INITIALIZED);
    if (!initialized) {
      // handle popstate events
      window.onpopstate = function (event) {
        update(symbols.ACTION_START_NAVIGATION, {
          path: event.state.path, // path stored when state is "pushed"
          isPopState: true
        });
      };
      // run state initialization
      return update(symbols.ACTION_INITIALIZE, { update, routes });
    }

    // handle navigation, if required
    const transitionLock = state.get(symbols.STATE_TRANSITION_LOCK);
    const currentRoute = state.get(symbols.STATE_CURRENT_ROUTE);
    const incomingRoute = state.get(symbols.STATE_INCOMING_ROUTE);
    if (transitionLock && currentRoute && incomingRoute) {
      const currentRouteStatus = currentRoute.get("status");
      const incomingRouteStatus = incomingRoute.get("status");
      if (currentRouteStatus === symbols.STATUS_EXITING && incomingRouteStatus === symbols.STATUS_ENTERING)
        update(symbols.ACTION_HANDLE_NAVIGATION);

      // otherwise, finish navigation, if required
      else if (currentRouteStatus === symbols.STATUS_INACTIVE && incomingRouteStatus === symbols.STATUS_ACTIVE)
        update(symbols.ACTION_FINISH_NAVIGATION, { update });
    }

    // propagate state to the current route's effects
    const effects = currentRoute.get("component").get("effects");
    if (effects && effects.forEach)
      effects.forEach(effect => effect(state, update));

  };

};
