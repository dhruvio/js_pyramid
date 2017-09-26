"use strict";

const isString    = require("lodash/isString");
const symbols     = require("./symbols");
const pushState   = require("./push-state");
const createRoute = require("./create-route");
const sourceRoute = require("./source-route");
const delegate    = require("../../helpers/delegate");
const log         = require("../../services/logger")("pyramid:effects:router");

const actions = {};

actions.ACTION_INITIALIZE = function (state, { update, routes }) {
  // if already initialized, abort
  if (state.get(symbols.STATE_INITIALIZED) === true)
    return state;
  // source the current route from the URL
  // if it hasn't been defined, throw an error
  const currentRoute = sourceRoute(routes, update);
  if (!currentRoute)
    throw new window.Error(`No route defined for ${window.location.href}`);
  // otherwise initialize the router state
  return state.set(symbols.STATE_TRANSITION_LOCK, false)
              .set(symbols.STATE_CURRENT_ROUTE, currentRoute)
              .set(symbols.STATE_INCOMING_ROUTE, null)
              .set(symbols.STATE_CREATE_ROUTE, (path, isPopState) => createRoute(routes, path, symbols.STATUS_ENTERING, symbols.ACTION_INCOMING_ROUTE, update, isPopState))
              .set(symbols.STATE_INITIALIZED, true);
};

actions.ACTION_START_NAVIGATION = function (state, { path, isPopState = false }) {
  // validate path
  if (!isString(path)) {
    log.error("data.path must be a string", { path })
    return state;
  }
  // if transition is currently happening, abort
  const transitionLock = state.get(symbols.STATE_TRANSITION_LOCK);
  if (transitionLock) {
    log.warn("transition is taking place, aborting navigation", { path });
    return state;
  }
  // kick off the navigation process
  // update current route
  let currentRoute = state.get(symbols.STATE_CURRENT_ROUTE);
  currentRoute = currentRoute.set("status", symbols.STATUS_EXITING);
  // create incoming route
  const incomingRoute = state.get(symbols.STATE_CREATE_ROUTE)(path, isPopState);
  // propagate state changes
  return state.set(symbols.STATE_TRANSITION_LOCK, true)
              .set(symbols.STATE_CURRENT_ROUTE, currentRoute)
              .set(symbols.STATE_INCOMING_ROUTE, incomingRoute); 
};

actions.ACTION_FINISH_NAVIGATION = function (state, { update }) {
  let incomingRoute = state.get(symbols.STATE_INCOMING_ROUTE);
  // push state as long as the incoming route is not
  // the consequence of a popstate event
  if (!incomingRoute.get("isPopState"))
    pushState(incomingRoute.get("path")); // maybe do this in the effect function instead of an action
  // change the update function for incoming route
  // as it will become the current route
  incomingRoute = incomingRoute.set("update", delegate.bind(null, update, symbols.ACTION_CURRENT_ROUTE));
  return state.set(symbols.STATE_TRANSITION_LOCK, false)
              .set(symbols.STATE_CURRENT_ROUTE, incomingRoute)
              .set(symbols.STATE_INCOMING_ROUTE, null);
};

actions.ACTION_CURRENT_ROUTE = routeActionHandler.bind(null, symbols.STATE_CURRENT_ROUTE);

actions.ACTION_INCOMING_ROUTE = routeActionHandler.bind(null, symbols.STATE_INCOMING_ROUTE);

// export actions

module.exports = actions;

// helper function to delegate actions to current/incoming routes

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
