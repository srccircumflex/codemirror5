
(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"), require("./xml"), require("../javascript/javascript"), require("../css/css"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror", "./xml", "../javascript/javascript", "../css/css"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("html", function (cmConfig, parserConfig) {
  var mode_javascript = CodeMirror.getMode(cmConfig, "javascript"),
      mode_json = CodeMirror.getMode(cmConfig, "application/json"),
      mode_jsonld = CodeMirror.getMode(cmConfig, "application/ld+json"),
      mode_typescript = CodeMirror.getMode(cmConfig, "application/javascript"),
      mode_plain = CodeMirror.getMode(cmConfig, "text/plain"),
      mode_css = CodeMirror.getMode(cmConfig, "text/css"),
      mode_scss = CodeMirror.getMode(cmConfig, "text/x-scss"),
      mode_less = CodeMirror.getMode(cmConfig, "text/x-less"),
      mode_gss = CodeMirror.getMode(cmConfig, "text/x-gss");

  const defaultConfig = {
    name: "xml",
    textMode: undefined,
    autoSelfClosers: [
      'area', 'base', 'br', 'col', 'command',
      'embed', 'frame', 'hr', 'img', 'input',
      'keygen', 'link', 'meta', 'param', 'source',
      'track', 'wbr', 'menuitem'
    ],
    implicitlyClosed: [
      'dd', 'li', 'optgroup', 'option', 'p',
      'rp', 'rt', 'tbody', 'td', 'tfoot',
      'th', 'tr'
    ],
    tagConfigs: [
      {
        tags: ["script"],
        defaultInnerMode: mode_javascript,
        innerModeByAttrs: [
          ["type", /^((((text|application)\/)?(x-)?(java|ecma)script)|module|)$/i, mode_javascript],
          ["type", /^((application\/)?(x-|manifest\+)?json)$/i, mode_json],
          ["type", /^((application\/)?ld\+json)$/i, mode_jsonld],
          ["type", /^(((text|application)\/)?typescript)$/i, mode_typescript],
          ["type", /./, mode_plain],
          ["lang", /^json$/i, mode_json],
          ["lang", /^ld\+json$/i, mode_jsonld],
          ["lang", /^typescript$/i, mode_typescript],
          ["lang", /./, mode_plain],
        ]
      },
      {
        tags: ["style"],
        defaultInnerMode: mode_css,
        innerModeByAttrs: [
          ["type", /^(((text\/)?(x-)?(stylesheet|css))|)$/i, mode_css],
          ["type", /^(((text\/)?(x-)?scss)|)$/i, mode_scss],
          ["type", /^(((text\/)?(x-)?less)|)$/i, mode_less],
          ["type", /^(((text\/)?(x-)?gss)|)$/i, mode_gss],
          ["type", /./, mode_plain],
          ["lang", /^css$/i, mode_css],
          ["lang", /^scss$/i, mode_scss],
          ["lang", /^less$/i, mode_less],
          ["lang", /^gss$/i, mode_gss],
          ["lang", /./, mode_plain],
        ]
      },
      {
        tags: [/./],
        attrModes: [
          ["style", CodeMirror.getMode(cmConfig, {name: "text/css", inline: true})],
        ]
      },
    ]
  }
  return CodeMirror.getMode(cmConfig, defaultConfig)
})

})