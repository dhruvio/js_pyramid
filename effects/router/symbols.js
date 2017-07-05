"use strict";

// set up closure state for makeSymbol function

let symbolCounter = 0;

// define symbols

const symbols = {};

// route status
symbols.STATUS_ACTIVE            = makeSymbol("STATUS_ACTIVE");
symbols.STATUS_INACTIVE          = makeSymbol("STATUS_INACTIVE");
symbols.STATUS_ENTERING          = makeSymbol("STATUS_ENTERING");
symbols.STATUS_EXITING           = makeSymbol("STATUS_EXITING");
// actions
symbols.ACTION_INITIALIZE        = makeSymbol("ACTION_INITIALIZE");
symbols.ACTION_START_NAVIGATION  = makeSymbol("ACTION_START_NAVIGATION");
symbols.ACTION_FINISH_NAVIGATION = makeSymbol("ACTION_FINISH_NAVIGATION");
symbols.ACTION_HANDLE_NAVIGATION = makeSymbol("ACTION_HANDLE_NAVIGATION");
symbols.ACTION_CURRENT_ROUTE     = makeSymbol("ACTION_CURRENT_ROUTE");
symbols.ACTION_INCOMING_ROUTE    = makeSymbol("ACTION_INCOMING_ROUTE");
// state
symbols.STATE_CURRENT_ROUTE      = makeSymbol("STATE_CURRENT_ROUTE");
symbols.STATE_INCOMING_ROUTE     = makeSymbol("STATE_INCOMING_ROUTE");
symbols.STATE_INITIALIZED        = makeSymbol("STATE_INITIALIZED");
symbols.STATE_TRANSITION_LOCK    = makeSymbol("STATE_TRANSITION_LOCK");
symbols.STATE_CREATE_ROUTE       = makeSymbol("STATE_CREATE_ROUTE");

// export symbols enum

module.exports = symbols;

// helper to make a string symbol

function makeSymbol (id) {
  return "_EFFECT_ROUTER_" + symbolCounter++ + (id ? `_${id}` : "");
}
