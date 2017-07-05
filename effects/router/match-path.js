"use strict";

const url = require("url");

module.exports = function (routes, path) {
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
};
