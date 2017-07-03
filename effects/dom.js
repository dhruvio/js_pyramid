"use strict";

// intended for internal use only

const domDelegator = require("dom-delegator");
const patch        = require("../helpers/patch");
const diff         = require("../helpers/diff");
const create       = require("../helpers/create-element");

module.exports = function (render, element) {

  let tree;
  let root;
  let initialized = false;

  return function (state, update) {
    // convert immutable state to JS object
    state = state.toJS();
    if (!initialized) {
      // set up the dom delegator to delegate DOM events.
      // it's okay to run this multiple times, as DOM delegator
      // ensures it only affects global state once.
      domDelegator();
      // set up the initial virtual tree and DOM element
      tree = render(state, update);
      root = create(tree);
      // append the component root to the parent element
      element.appendChild(root);
      // only run the initialization once
      initialized = true;
    } else {
      // diff and persist changes to the virtual app tree
      const newTree = render(state, update);
      const patches = diff(tree, newTree);
      root = patch(root, patches);
      tree = newTree;
    }
  }
}
