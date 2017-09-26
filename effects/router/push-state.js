"use strict";

const window = require("global/window");

module.exports = function (path) {
  if (window.history && window.history.pushState)
    window.history.pushState({ path }, "", path);
};

