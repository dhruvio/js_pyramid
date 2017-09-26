"use strict";

const window = require("global/window");

module.exports = function (path) {
  if (window.history && window.history.replaceState)
    window.history.replaceState({ path }, "", path);
};
