"use strict";

const window = require("global/window");

module.exports = function (actionName = "animationFrame") {

  let request = null;

  function run (callback) {
    return window.requestAnimationFrame(frame => {
      callback(frame);
      run(callback);
    });
  }

  return function (state, update) {
    if (!request)
      request = run(frame => update("animationFrame", { frame }));
  };
};
