// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/5/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"), require("../htmlmixed/htmlmixed"),
        require("../../addon/mode/nesting"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror", "../htmlmixed/htmlmixed",
            "../../addon/mode/nesting"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  CodeMirror.defineMode("htmlembedded", function(config, parserConfig) {
    return CodeMirror.nestingMode(
      CodeMirror.getMode(config, "htmlmixed"), 
      {
        open: parserConfig.openComment || "<%--",
        close: parserConfig.closeComment || "--%>",
        delimStyle: "comment",
        mode: {
          token: function(stream) {
            stream.skipTo(closeComment) || stream.skipToEnd()
            return "comment"
          }
        }
      }, 
      {
        open: parserConfig.open || parserConfig.scriptStartRegex || "<%",
        close: parserConfig.close || parserConfig.scriptEndRegex || "%>",
        mode: CodeMirror.getMode(config, parserConfig.scriptingModeSpec),
      }, 
    );
  }, "htmlmixed");

  CodeMirror.defineMIME("application/x-ejs", {name: "htmlembedded", scriptingModeSpec:"javascript"});
  CodeMirror.defineMIME("application/x-aspx", {name: "htmlembedded", scriptingModeSpec:"text/x-csharp"});
  CodeMirror.defineMIME("application/x-jsp", {name: "htmlembedded", scriptingModeSpec:"text/x-java"});
  CodeMirror.defineMIME("application/x-erb", {name: "htmlembedded", scriptingModeSpec:"ruby"});
});
