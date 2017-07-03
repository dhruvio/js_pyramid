/**
 * @module pyramid
 * (c) 2017 Dhruv Dang
 */

"use strict";

const window        = require("global/window");
const isPlainObject = require("lodash/isPlainObject");
const isArray       = require("lodash/isArray");
const isFunction    = require("lodash/isFunction");
const immutable     = require("immutable");
const dom           = require("./effects/dom");

const log     = require("./services/logger")("pyramid");
const Promise = window.Promise;

module.exports = bind;

function bind (element, { init, render, actions, effects }) {
  // validate component (arguments[1]) type
  if (!isPlainObject(arguments[1]))
    log.error("component must be a plain object", { component: arguments[1] });
  // validate component's function types here
  if (!isFunction(init))
    log.error("component.init must be a function", { init });
  if (!isFunction(render))
    log.error("component.render must be a function", { render });
  if (!isPlainObject(actions))
    log.error("component.actions must be a plain object", { actions });
  if (!isArray(effects))
    log.error("component.effects must be an array", { effects });
  // initialize the component state
  const state = initializeState(init);
  // start application loop
  loop(actions, effects.concat(dom(render, element)), state);
}

function initializeState (init) {
  // create the seed object
  const seed = init();
  // validate the seed object
  if (!isPlainObject(seed))
    return log.error("invalid seed state from init, must be a plain object", { seed });
  // marshall the seed object into an immutable JS map
  return immutable.fromJS(seed);
}

function loop (actions = {}, effects = [], state) {
  // set up a promise to thread state updates through in order
  let promise = Promise.resolve(state);
  // create closure variables to maintain state updates
  const updateQueue = []; // [ { actionName: String, data: a } ]
  let flushScheduled = false; // switch to manage whether queue flushing is required
  // helper to run effects
  function runEffects (state) {
    effects.forEach(effect => effect(state, update));
  }
  // set up the update function to persist state updates
  function update (actionName, data) {
    // push action to queue
    updateQueue.push({ actionName, data });
    // if queue flush is not scheduled, do so
    if (!flushScheduled) {
      // indicate flush is now scheduled
      flushScheduled = true;
      // flush queue in the promise thread
      // and run state effects if no further updates are flushScheduled
      promise = promise.then(state => {
                         // cache initial state
                         const initialState = state;
                         // flush the update queue
                         for (let i = 0; i < updateQueue.length; i++) {
                           // lookup and validate the action
                           const { actionName, data } = updateQueue.shift();
                           const action = actions[actionName];
                           if (!isFunction(action)) {
                             log.warn("invalid action", { actionName, action });
                           } else {
                             // run the action
                             state = action(state, data);
                           }
                         }
                         // reset flushScheduled state
                         flushScheduled = false;
                         // return state, and boolean indicating if state has changed
                         return {
                           state,
                           changed: !state.equals(initialState)
                         };
                       })
                       .then(({ state, changed }) => {
                         // run effects with state if required
                         if (changed) runEffects(state);
                         // return state to thread through promise
                         return state;
                       });
    }
  }
  // run the initial round of effects
  runEffects(state);
  // return the update function accessible to API consumers
  return update;
}
