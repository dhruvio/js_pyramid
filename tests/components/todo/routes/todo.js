"use strict";

module.exports = function (h, log) {

  return {

    init ({ params }) {
      return {
        text: `Single Todo: ${params.id}`
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
