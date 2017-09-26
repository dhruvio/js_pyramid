"use strict";

const immutable = require("immutable");
const matchPath = require("./match-path");
const delegate  = require("../../helpers/delegate");

module.exports = function (routes, path, status, parentActionName, update, isPopState = false) {
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
