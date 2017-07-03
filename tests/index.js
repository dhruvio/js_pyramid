"use strict";

const document   = require("global/document");
const pyramid    = require("../");
const h          = require("../helpers/h");
const log        = require("../services/logger")("tests");
const components = require("./components");

components.forEach(function (component) {
  const cLog = log.create(component.id);
  pyramid(document.body, component(h, cLog));
});
