"use strict";

const router         = require("../../../effects/router");
const routerSymbols  = require("../../../effects/router/symbols");
const routerActions  = require("../../../effects/router/actions");
const routerNavigate = require("../../../effects/router/navigate");
const TodoList       = require("./routes/todo-list");
const Todo           = require("./routes/todo");

function component (h, log) {

  function init () {
    return {
      text: "Todo App"
    };
  }

  const actions = {

    // attach pre-defined router actions
    [routerSymbols.ACTION_INITIALIZE]: routerActions.ACTION_INITIALIZE,
    [routerSymbols.ACTION_START_NAVIGATION]: routerActions.ACTION_START_NAVIGATION,
    [routerSymbols.ACTION_FINISH_NAVIGATION]: routerActions.ACTION_FINISH_NAVIGATION,
    [routerSymbols.ACTION_CURRENT_ROUTE]: routerActions.ACTION_CURRENT_ROUTE,
    [routerSymbols.ACTION_INCOMING_ROUTE]: routerActions.ACTION_INCOMING_ROUTE,

    // handle route transitions
    [routerSymbols.ACTION_HANDLE_NAVIGATION]: function (state) {
      const CR = routerSymbols.STATE_CURRENT_ROUTE;
      const IR = routerSymbols.STATE_INCOMING_ROUTE;
      var current = state.get(CR);
      var incoming = state.get(IR);
      current = current.set("status", routerSymbols.STATUS_INACTIVE);
      incoming = incoming.set("status", routerSymbols.STATUS_ACTIVE);
      return state.set(CR, current).set(IR, incoming);
    }

  };

  const effects = [
    router({
      routes: [
        {
          pattern: "/",
          component: TodoList(h, log)
        },
        {
          pattern: "/todo/:id",
          component: Todo(h, log)
        }
      ]
    })
  ];

  function render (state, update) {
    log.info("render", state);
    const navigate = routerNavigate.bind(null, update);
    const currentRoute = state[routerSymbols.STATE_CURRENT_ROUTE];
    const incomingRoute = state[routerSymbols.STATE_INCOMING_ROUTE];
    if (!currentRoute)
      return h("div", "No route present");
    else 
      return h("div", [
        h("h2", [ state.text ]),
        h("div.current-route", [
          h("h3", [ "Current Route" ]),
          currentRoute.component.render(currentRoute.state, currentRoute.update)
        ]),
        incomingRoute ? h("div.incoming-route", [
          h("h3", [ "Incoming Route" ]),
          incomingRoute.component.render(incomingRoute.state, incomingRoute.update)
        ]) : undefined,
        h("ul", [
          h("li", {
            "ev-click": () => navigate("/")
          }, [
            "go to todo list"
          ]),
          h("li", {
            "ev-click": () => navigate("/todo/437")
          }, [
            "go to todo item"
          ])
        ])
      ]);
  }
  
  return {
    init,
    actions,
    effects,
    render
  };
}

component.id = "todo";

module.exports = component;
