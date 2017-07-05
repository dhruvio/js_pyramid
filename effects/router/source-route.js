"use strict";

const window       = require("global/window");
const replaceState = require("./replace-state");
const createRoute  = require("./create-route");
const symbols      = require("./symbols");

module.exports = function (routes, update) {
  // determine the path
  const path = window.location.href.replace(window.location.origin, "");
  // set the state object on the current history entry
  // on a fresh page load, coming "back" to this page
  // should work by ensuring the path is in the entry's
  // state object
  replaceState(path);
  // return the route object for state persistence
  return createRoute(routes, path, symbols.STATUS_ACTIVE, symbols.ACTION_CURRENT_ROUTE, update);
}

