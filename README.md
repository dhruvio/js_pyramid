# Pyramid

Pyramid is a composable web UI framework. It is based on the [Elm architecture](https://guide.elm-lang.org/architecture/), and is implemented in JavaScript, utilising the [virtual-dom](https://github.com/Matt-Esch/virtual-dom) library for rendering, and [ImmutableJS](https://github.com/facebook/immutable-js) for state management.

The main goal of this framework is to provide a minimal API to build applications with unidirectional data flow. The struggle of implementing such a framework in JavaScript is that the language is dynamic, and its data structures are mutable. By utilising the Elm architecture and ImmutableJS, Pyramid components are have four parts: state initialization (`init`), state mutation (`actions`), rendering (`render`), and side-effects (`effects`). If you are coming from building applications with React, Mercury, or Elm, most, if not all, of this will be familiar to you. The most foreign concept may be the notion of side-effects. The idea behind side-effects is to organise code that interacts with the browser's API into one section of your component, as opposed to making pure parts of your application impure. As the documentation for this framework improves over time, the role of effects will become more apparent.

Over time, this repository aims to also provide a set of effects and utility functions that will assist developers in building composable applications with ease. For example, an asynchronous router using the browser's history API is currently under development as an effect. Other developers are welcome to contribute their own effects and utility functions to this repository, however please be friendly and humble :-).


## Example usage

```javascript
// dependencies
const pyramid                    = require("@dhruvio/pyramid");
const h                          = require("@dhruvio/pyramid/helpers/h");
const createAnimationFrameEffect = require("@dhruvio/pyramid/effects/animation-frame");

// set up the root component
const app = {

  // the app is going to track the last animation frame
  // and the number of frames elapsed
  init () {
    return {
      lastFrame: 0,
      numFrames: 0
    },

  // the animation frame effect triggers an action
  // named "animationFrame" with the current frame time
  // every time the callback registered with requestAnimationFrame
  // is called
  actions: {
    animationFrame: function (state, { frame }) {
      return state.merge({
        lastFrame: frame,
        numFrames: state.get("numFrames") + 1
      });
    }
  },

  // we use the pyramid-supplied animation frame effect
  // it takes one argument, which is the action name
  // that should be triggered every time an animation frame
  // comes through; and it returns the effect function
  effects: [
    createAnimationFrameEffect("animationFrame")
  ],

  // we render a simple DOM tree that displays the state
  // in a list
  render: function (state, update) {
    return h("ul#main", [
      h("li", [ "lastFrame: " + state.get("lastFrame") ]),
      h("li", [ "numFrames: " + state.get("numFrames") ])
    ]);
  }

};

// append the component to the <body>; and
// kick off the run loop
pyramid(document.body, app);
```


## API

### Functions

This section describes core functions exported from Pyramid.

#### `pyramid (element: HTMLElement, rootComponent: Component): Undefined`

This is the main function exported by Pyramid when you run `require("@dhruvio/pyramid")`. It takes two arguments, the HTML element you want your application to be appended to (e.g. `document.body`), and the root [Component](#component) of your application.

### Types

This section describes common types used in Pyramid applications.

#### `Component`

A plain object defining a single component. Component's can be reasoned as if they have their own state life cycle. Each component has four properties:

##### `init (): Object`

The state initialization function. It accepts no arguments and returns a plain JavaScript describing the starting state for your component. Pyramid converts this to an ImmutableJS object internally.

##### `actions: Object`

A plain object. Each key must be a string (i.e. an action's name), and each value must be of `action (state: ImmutableState, data: Any): ImmutableState`. Pyramid creates an [update](#update) function that, when called, triggers an action specified in this object. The action is called with the current state and any data specified during the `update` function call. The value returned from the action must be the new state to replace the entire component's state.

##### `effects: [effect (state: ImmutableState, update: UpdateFunction): Undefined]`

A list of functions that receive the current state and an update function to trigger state mutations. Each effect function is called after a cycle of state mutations.

On a related note, the entire render cycle is implemented as an effect internal to Pyramid!

##### `render (state: ImmutableState, update: UpdateFunction): VTree`

A function that receive the current state and an update function to trigger state mutations. The function is expected to return a `virtual-dom` VTree, typically created with the library's `h` function.

#### `ImmutableState`

An ImmutableJS object that represents a component's state.

#### `UpdateFunction`

A function constructed internally in Pyramid to dispatch state mutations. It is of the following type: `update (actionName: String, data: Any): Undefined`. Each `actionName` must correspond to one of the component's actions.

#### `VTree`

The object returned from `virtual-dom`'s `h` function.


## Links

- [License](LICENSE.txt)
- [Credits](CREDITS.md)


## Author

Dhruv Dang  
[hi@dhruv.io](mailto:hi@dhruv.io)  
[dhruv.io](https://dhruv.io)
