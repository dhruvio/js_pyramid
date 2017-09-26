"use strict";

module.exports = function (h, log) {

  return {

    init () {
      return {
        text: "Todo List"
      };
    },

    actions: {

    },

    effects: [],

    render (state, update) {
      return h("div", [
        state.text
      ]);
    }

  };

};
