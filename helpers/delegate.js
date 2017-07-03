"use strict";

module.exports = function (update, parentActionName, childActionName, data) {
  update(parentActionName, { childActionName, data });
};
