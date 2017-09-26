"use strict";

const symbols = require("./symbols");

module.exports = function (update, path) {
  update(symbols.ACTION_START_NAVIGATION, { path });
};
