(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {

  CodeMirror.Nester.globalDelimMap["o<$"] = (cm, inserted, token, nest, nesterState, POINTER) => {
    if (nest._autoClose) {
      let stackEntry = nest.findNestClose(cm, nesterState, POINTER.line);
      if (stackEntry && !stackEntry.endMatch) {
        let autoClose = nest._autoClose.configure(
          {...POINTER},
          stackEntry,
          nesterState,
          cm,
        );
        if (autoClose.text) {
          let indentNL = () => {}, setPOS = autoClose.cursor;
          if (autoClose.indent !== false) {
            // (default)
            indentNL = (lineNo, how = "smart") => cm.indentLine(lineNo, how, true)
          }
          if (autoClose.type == "block") {
            cm.replaceRange(autoClose.text, POINTER, POINTER, "+insert");
            cm.replaceRange("\n\n", POINTER, POINTER, "+insert");
            indentNL(POINTER.line + 1);
            let nesterState_fake = {...nesterState};
            nesterState_fake.nest = null;
            indentNL(POINTER.line + 2, nesterState_fake);
            setPOS ||= {line: POINTER.line + 1, ch: Infinity};
          } else {
            cm.replaceRange(autoClose.text, POINTER, POINTER, "+insert");
            setPOS = autoClose.cursor;
          }
          if (setPOS) {
            POINTER.line = setPOS.line;
            POINTER.ch = setPOS.ch;
          }
        }
      }
    }
  };

  CodeMirror.Nester.autoCloseFactory = {
    "block": function (pos, stackEntry, state, cm) {
      var conf = this,
          line = cm.getLine(pos.line),
          delimStart = stackEntry.startMatch.cur + stackEntry.startMatch.index,
          before = line.slice(0, delimStart);
      if (
        !(
          before.match(/\S/g)
          || /* after */ line.slice(delimStart + stackEntry.startMatch[0].length)
          .match(/\S/g)
        )
      ) {
        // only delim in line
        conf = {...this};
        conf.text = "\n\n" + this.text;
        conf.cursor = {line: pos.line + 1, ch: Infinity};
      }
      return conf;
    }
  }
})
