"use strict";

/*

current/incoming route:

{ status: STATUS, path: "", hash: "", query: {}, params: {}, state: {}, render() }

incoming route may be null (i.e. not in transition)

---

routes:

[
  { pattern: "/", component: { init, actions, effects, render } },
  { pattern: "/users", component: { init, actions, effects, render } },
  { pattern: "/users/:id", component: { init, actions, effects, render } },
  { pattern: "*", component: { init, actions, effects, render } } // 404
]

--- transition stages

NOTE: need to maintain internally which stage we are at with the ongoing transition

// startNavigation action (internal)
1. start navigation // c user, d effect

// handleNavigation action (user-defined)
2. exiting current route // c effect, d user
3. entering incoming route // c effect, d user

// user-defined actions
// happens at some point when the user is ready for the routes to transition
4. inactive current route // set by user
5. active incoming route // set by user

// finishNavigation action (internal)
6. set current route to incoming route // c effect, d effect
7. set incoming route to null // c effect, d effect
8. stop navigation // c effect, d effect

*/

const window        = require("global/window");
const immutable     = require("immutable");
const noop          = require("lodash/noop");
const isPlainObject = require("lodash/isPlainObject");
const isArray       = require("lodash/isArray");
const isString      = require("lodash/isString");
const log           = require("../services/logger")("pyramid:effects:router");

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
// state
const STATE_CURRENT_ROUTE      = make.symbols.STATE_CURRENT_ROUTE      = makeKey();
const STATE_INCOMING_ROUTE     = make.symbols.STATE_INCOMING_ROUTE     = makeKey();

// set up internal symbols

// state
const STATE_INITIALIZED     = makeKey();
const STATE_TRANSITION_LOCK = makeKey();
const STATE_CREATE_ROUTE    = makeKey();

// set up public actions dict

// TODO
function navigate (update, path) {
  update(ACTION_START_NAVIGATION, { path });
}

function routeUpdate (update, parentActionName, childActionName, data) {
  update(parentActionName, { childActionName, data });
}
// TODO

make.actions = {};

make.actions[ACTION_INITIALIZE] = function (state, { routes }) {
  // if already initialized, abort
  if (state.get(STATE_INITIALIZED) === true)
    return state;
  // otherwise initialize the router state
  return state.set(STATE_TRANSITION_LOCK, false)
              .set(STATE_CURRENT_ROUTE, sourceRouteFromURL(routes))
              .set(STATE_INCOMING_ROUTE, null)
              .set(STATE_CREATE_ROUTE, path => createRoute(routes, path, STATUS_ENTERING))
              .set(STATE_INITIALIZED, true);
};

make.actions[ACTION_START_NAVIGATION] = function (state, { path }) {
  // validate path
  if (!isString(path)) {
    log.error("data.path must be a string", { path })
    return state;
  }
  // if transition is currently happening, abort
  const transitionLock = state.get(STATE_TRANSITION_LOCK);
  if (transitionLock) {
    log.warn("transition is taking place, aborting navigation", { path, existingTransition });
    return state;
  }
  // kick off the navigation process
  // update current route
  let currentRoute = state.get(STATE_CURRENT_ROUTE);
  currentRoute = currentRoute.set("status", STATUS_EXITING);
  // create incoming route
  const incomingRoute = state.get(STATE_CREATE_ROUTE)(path);
  // propagate state changes
  return state.set(STATE_TRANSITION_LOCK, true)
              .set(STATE_CURRENT_ROUTE, currentRoute)
              .set(STATE_INCOMING_ROUTE, incomingRoute); 
};

make.actions[ACTION_FINISH_NAVIGATION] = function (state) {
  const incomingRoute = state.get(STATE_INCOMING_ROUTE);
  pushState(incomingRoute.get("path")); // maybe do this in the effect function instead of an action
  return state.set(STATE_TRANSITION_LOCK, false)
              .set(STATE_CURRENT_ROUTE, incomingRoute)
              .set(STATE_INCOMING_ROUTE, null);
};

make.actions[ACTION_CURRENT_ROUTE] = function (state, { actionName, data }) {
  let currentRoute = state.get(STATE_CURRENT_ROUTE);
  const actions = currentRoute.get("component")
                              .get("actions");
  const action = actions.get(actionName);
  if (action) {
    const newRouteState = state.action(currentRoute.get("state"), data);
    currentRoute = currentRoute.set("state", newRouteState);
    state = state.set(STATE_CURRENT_ROUTE, currentRoute);
  }
  return state;
};

module.exports = function make ({ routes, useHash = true }) {

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

  if (!isBool(pushState)) {
    log.error("options.pushState must be a plain object", { pushState });
    valid = false;
  }

  // if validation fails, exit early and provide empty effect
  if (!valid) {
    log.error("effect creation's validation failed, returning no-op effect");
    return noop;
  }

  // return effect handler

  return function (state, update) {
    // initialize the router state if necessary
    // and abort
    const initialized = state.get(STATE_INITIALIZED);
    if (!initialized)
      return update(ACTION_INITIALIZE, { routes });
    // handle navigation, if required
    const transitionLock = state.get(STATE_TRANSITION_LOCK);
    const currentRouteStatus = state.get(STATE_CURRENT_ROUTE)
                                    .get("status");
    const incomingRouteStatus = state.get(STATE_INCOMING_ROUTE)
                                     .get("status");
    if (transitionLock && currentRouteStatus === STATUS_EXITING && incomingRouteStatus === STATUS_ENTERING)
      update(ACTION_HANDLE_NAVIGATION);
    // otherwise, finish navigation, if required
    else if (transitionLock && currentRouteStatus === STATUS_INACTIVE && incomingRouteStatus === STATUS_ACTIVE)
      update(ACTION_FINISH_NAVIGATION);
    // propagate state to the current route's effects
    const effects = state.get(STATE_CURRENT_ROUTE)
                         .get("component")
                         .get("effects");
    if (effects && effects.forEach)
      effects.forEach(effect => effect(state, update));
  };
};

// helper functions

const keyCounter = 0;
function makeKey () {
  return "_EFFECT_ROUTER_" + keyCounter++;
}

function createRoute (routes, path, status) {
  const { pattern, params, query, hash, component } = matchPath(routes, path);
  return Immutable.fromJS({
    status,
    path,
    params,
    query,
    hash,
    pattern, // use pattern as ID
    component,
    state: component.init({ path, params, query, hash })
  });
}

function matchPath (routes, path) {

}

function sourceRouteFromURL (routes) {
  const path = window.location.href.replace(window.location.origin, "");
  return createRoute(routes, path, STATUS_ACTIVE);
}

function pushState (path) {
  if (window.history && window.history.pushState)
    window.history.pushState(path);
}
