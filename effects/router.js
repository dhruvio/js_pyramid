"use strict";

// TODO
// validate all routes
// documentation
// try code cleanup

// imports

const window        = require("global/window");
const immutable     = require("immutable");
const pathToRegexp  = require("path-to-regexp");
const url           = require("url");
const noop          = require("lodash/noop");
const isPlainObject = require("lodash/isPlainObject");
const isArray       = require("lodash/isArray");
const isString      = require("lodash/isString");
const isBoolean     = require("lodash/isBoolean");
const delegate      = require("../helpers/delegate");
const log           = require("../services/logger")("pyramid:effects:router");

// closure state

let keyCounter = 0;

// set up public symbols enum

make.symbols = {};

// route status
const STATUS_ACTIVE            = make.symbols.STATUS_ACTIVE            = makeKey();
const STATUS_INACTIVE          = make.symbols.STATUS_INACTIVE          = makeKey();
const STATUS_ENTERING          = make.symbols.STATUS_ENTERING          = makeKey();
const STATUS_EXITING           = make.symbols.STATUS_EXITING           = makeKey();
// actions
const ACTION_INITIALIZE        = make.symbols.ACTION_INITIALIZE        = makeKey();
const ACTION_START_NAVIGATION  = make.symbols.ACTION_START_NAVIGATION  = makeKey();
const ACTION_FINISH_NAVIGATION = make.symbols.ACTION_FINISH_NAVIGATION = makeKey();
const ACTION_HANDLE_NAVIGATION = make.symbols.ACTION_HANDLE_NAVIGATION = makeKey();
const ACTION_CURRENT_ROUTE     = make.symbols.ACTION_CURRENT_ROUTE     = makeKey();
const ACTION_INCOMING_ROUTE    = make.symbols.ACTION_INCOMING_ROUTE    = makeKey();
// state
const STATE_CURRENT_ROUTE      = make.symbols.STATE_CURRENT_ROUTE      = makeKey();
const STATE_INCOMING_ROUTE     = make.symbols.STATE_INCOMING_ROUTE     = makeKey();

// set up internal symbols

// state
const STATE_INITIALIZED     = makeKey();
const STATE_TRANSITION_LOCK = makeKey();
const STATE_CREATE_ROUTE    = makeKey();

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
    const initialized = state.get(STATE_INITIALIZED);
    if (!initialized) {
      // handle popstate events
      window.onpopstate = function (event) {
        update(ACTION_START_NAVIGATION, {
          path: event.state.path, // path stored when state is "pushed"
          isPopState: true
        });
      };
      // run state initialization
      return update(ACTION_INITIALIZE, { update, routes });
    }

    // handle navigation, if required
    const transitionLock = state.get(STATE_TRANSITION_LOCK);
    const currentRoute = state.get(STATE_CURRENT_ROUTE);
    const incomingRoute = state.get(STATE_INCOMING_ROUTE);
    if (transitionLock && currentRoute && incomingRoute) {
      const currentRouteStatus = currentRoute.get("status");
      const incomingRouteStatus = incomingRoute.get("status");
      if (currentRouteStatus === STATUS_EXITING && incomingRouteStatus === STATUS_ENTERING)
        update(ACTION_HANDLE_NAVIGATION);

      // otherwise, finish navigation, if required
      else if (currentRouteStatus === STATUS_INACTIVE && incomingRouteStatus === STATUS_ACTIVE)
        update(ACTION_FINISH_NAVIGATION, { update });
    }

    // propagate state to the current route's effects
    const effects = currentRoute.get("component").get("effects");
    if (effects && effects.forEach)
      effects.forEach(effect => effect(state, update));

  };

};

// set up public actions dict

make.actions = {};

make.actions.ACTION_INITIALIZE = function (state, { update, routes }) {
  // if already initialized, abort
  if (state.get(STATE_INITIALIZED) === true)
    return state;
  // source the current route from the URL
  // if it hasn't been defined, throw an error
  const currentRoute = sourceRouteFromURL(routes, update);
  if (!currentRoute)
    throw new window.Error(`No route defined for ${window.location.href}`);
  // otherwise initialize the router state
  return state.set(STATE_TRANSITION_LOCK, false)
              .set(STATE_CURRENT_ROUTE, currentRoute)
              .set(STATE_INCOMING_ROUTE, null)
              .set(STATE_CREATE_ROUTE, (path, isPopState) => createRoute(routes, path, STATUS_ENTERING, ACTION_INCOMING_ROUTE, update, isPopState))
              .set(STATE_INITIALIZED, true);
};

make.actions.ACTION_START_NAVIGATION = function (state, { path, isPopState = false }) {
  // validate path
  if (!isString(path)) {
    log.error("data.path must be a string", { path })
    return state;
  }
  // if transition is currently happening, abort
  const transitionLock = state.get(STATE_TRANSITION_LOCK);
  if (transitionLock) {
    log.warn("transition is taking place, aborting navigation", { path });
    return state;
  }
  // kick off the navigation process
  // update current route
  let currentRoute = state.get(STATE_CURRENT_ROUTE);
  currentRoute = currentRoute.set("status", STATUS_EXITING);
  // create incoming route
  const incomingRoute = state.get(STATE_CREATE_ROUTE)(path, isPopState);
  // propagate state changes
  return state.set(STATE_TRANSITION_LOCK, true)
              .set(STATE_CURRENT_ROUTE, currentRoute)
              .set(STATE_INCOMING_ROUTE, incomingRoute); 
};

make.actions.ACTION_FINISH_NAVIGATION = function (state, { update }) {
  let incomingRoute = state.get(STATE_INCOMING_ROUTE);
  // push state as long as the incoming route is not
  // the consequence of a popstate event
  if (!incomingRoute.get("isPopState"))
    pushState(incomingRoute.get("path")); // maybe do this in the effect function instead of an action
  // change the update function for incoming route
  // as it will become the current route
  incomingRoute = incomingRoute.set("update", delegate.bind(null, update, ACTION_CURRENT_ROUTE));
  return state.set(STATE_TRANSITION_LOCK, false)
              .set(STATE_CURRENT_ROUTE, incomingRoute)
              .set(STATE_INCOMING_ROUTE, null);
};

make.actions.ACTION_CURRENT_ROUTE = routeActionHandler.bind(null, STATE_CURRENT_ROUTE);

make.actions.ACTION_INCOMING_ROUTE = routeActionHandler.bind(null, STATE_INCOMING_ROUTE);

// export function to navigate

make.navigate = function (update, path) {
  update(ACTION_START_NAVIGATION, { path });
};

// helper functions

function makeKey () {
  return "_EFFECT_ROUTER_" + keyCounter++;
}

function createRoute (routes, path, status, parentActionName, update, isPopState = false) {
  // find the route that matches the given path
  const match = matchPath(routes, path); 
  // if no match exists, return null
  // null is the default empty value for routes
  if (!match)
    return null
  // if a match exists,
  // create the route object for the state
  const { pattern, params, url, component } = match;
  return immutable.fromJS({
    status,
    path,
    params,
    url,
    pattern, // use pattern as ID
    component,
    update: delegate.bind(null, update, parentActionName),
    state: component.init({ path, params, url }),
    isPopState
  });
}

function matchPath (routes, path) {
  // find route that matches
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const match = path.match(route.regexp);
    if (match) {
      // create params object
      const paramValues = match.slice(1);
      const params = paramValues.reduce((params, value, i) => {
        params[route.keys[i].name] = value;
        return params;
      }, {});
      // return matched route info
      return {
        params,
        pattern: route.pattern,
        url: url.parse(path, true),
        component: route.component
      };
    }
  }
  // no route found
  return null;
}

function sourceRouteFromURL (routes, update) {
  // determine the path
  const path = window.location.href.replace(window.location.origin, "");
  // set the state object on the current history entry
  // on a fresh page load, coming "back" to this page
  // should work by ensuring the path is in the entry's
  // state object
  replaceState(path);
  // return the route object for state persistence
  return createRoute(routes, path, STATUS_ACTIVE, ACTION_CURRENT_ROUTE, update);
}

function pushState (path) {
  if (window.history && window.history.pushState)
    window.history.pushState({ path }, "", path);
}

function replaceState (path) {
  if (window.history && window.history.replaceState)
    window.history.replaceState({ path }, "", path);
}

function routeActionHandler (routeKey, state, { actionName, data }) {
  let route = state.get(routeKey);
  const actions = route.get("component").get("actions");
  const action = actions.get(actionName);
  if (action) {
    const newRouteState = state.action(route.get("state"), data);
    route = route.set("state", newRouteState);
    state = state.set(routeKey, route);
  }
  return state;
}
