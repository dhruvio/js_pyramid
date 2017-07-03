"use strict";

const router = require("../../../effects/router");
const TodoList = require("./routes/todo-list");
const Todo = require("./routes/todo");

function component (h, log) {

  function init () {
    return {
      text: "Todo App"
    };
  }

  const actions = {

    // attach pre-defined router actions
    [router.symbols.ACTION_INITIALIZE]: router.actions.ACTION_INITIALIZE,
    [router.symbols.ACTION_START_NAVIGATION]: router.actions.ACTION_START_NAVIGATION,
    [router.symbols.ACTION_FINISH_NAVIGATION]: router.actions.ACTION_FINISH_NAVIGATION,
    [router.symbols.ACTION_CURRENT_ROUTE]: router.actions.ACTION_CURRENT_ROUTE,
    [router.symbols.ACTION_INCOMING_ROUTE]: router.actions.ACTION_INCOMING_ROUTE,

    // handle route transitions
    [router.symbols.ACTION_HANDLE_NAVIGATION]: function (state) {
      const CR = router.symbols.STATE_CURRENT_ROUTE;
      const IR = router.symbols.STATE_INCOMING_ROUTE;
      var current = state.get(CR);
      var incoming = state.get(IR);
      current = current.set("status", router.symbols.STATUS_INACTIVE);
      incoming = incoming.set("status", router.symbols.STATUS_ACTIVE);
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
    const navigate = router.navigate.bind(null, update);
    const currentRoute = state[router.symbols.STATE_CURRENT_ROUTE];
    const incomingRoute = state[router.symbols.STATE_INCOMING_ROUTE];
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
