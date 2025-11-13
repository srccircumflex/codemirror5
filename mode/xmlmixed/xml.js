// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/5/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"), require("../../addon/mode/nesting"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror", "../../addon/mode/nesting"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {

  CodeMirror.defineMode("@xml.text", function (cmConfig, tagConf) {
    return {
      startState: (indent, nestState) => {return {indent: indent == undefined ? 0 : indent, nestState: nestState}},
      token: (stream) => {
        var c = stream.next();
        if (c == "&") {
          var ok;
          if (stream.eat("#")) {
            if (stream.eat("x")) {
              ok = stream.eatWhile(/[a-fA-F\d]/) && stream.eat(";");
            } else {
              ok = stream.eatWhile(/[\d]/) && stream.eat(";");
            }
          } else {
            ok = stream.eatWhile(/[\w\.\-:]/) && stream.eat(";");
          }
          return ok ? "atom" : "error";
        } else {
          stream.eatWhile(/[^&]/);
          return null;
        }
      },
      indent: (state, textAfter, fullLine) => {
        if (state.nestState?.subConf && state.nestState.subConf.close.exec(textAfter)?.index == 0) {
          return state.nestState.main.indent(
            state.nestState // xml-block
            .nestState      // xml
            .nestState      // xml-block
          );
        }
        return state.indent;
      },
    }
  });

  CodeMirror.defineMode("@xml.tag", function (cmConfig, tagConf) {

    var subModes = [
      {
        open: /["']/,
        start: (match) => {return {close: match[0]}},
        mode: tagConf.parserConf.defaultAttrMode,
        modeConfig: tagConf.parserConf.defaultAttrModeConfig,
        delimStyle: "string",
        innerStyle: "string",
      },
    ]

    if (tagConf.parserConf.attrModes) {
      subModes = subModes.concat(
        tagConf.parserConf.attrModes.map(
          c => {
            return {
              open: typeof c[0] == "string" 
                    ? new RegExp(`${RegExp.escape(c[0])}=(?<q>["'])`) 
                    : new RegExp(`${c[0].source}=(?<q>["'])`, c[0].flags),
              start: (match) => {
                return {
                  tokenizeDelimiters: {
                    token: (stream) => {
                      var c = stream.next();
                      if (c == match.groups.q) return "string";
                      if (c == "=") return;
                      stream.match(/[\w\-]*/);
                      return "attribute";
                    }
                  },
                  close: match.groups.q,
                }
              },
              mode: c[1],
              modeConfig: c[2],
            }
          }
        )
      )
    }

    function _searchInnerByAttr (name, configs, cond2) {
      if (!configs) return undefined;
      for (var conf of configs) {
        if (conf[0].exec(name) && cond2(conf)) {
          tagConf.blockInnerConf.mode = conf[2];
          tagConf.blockInnerConf.modeConfig = conf[3];
          break;
        }
      }
    }

    function searchInnerByAttrConf (match) {
      return _searchInnerByAttr(
        match[1],
        tagConf.parserConf.innerByAttrConf,
        (conf) => conf[1].exec(match.groups.v),
      )
    }

    function searchInnerByAttrName (match) {
      return _searchInnerByAttr(
        match[1],
        tagConf.parserConf.innerByAttrName,
        () => true,
      )
    }

    const main = {
      startState: (indent, nestState) => {return {indent: indent, nestState: nestState}},
      token: (stream, state) => {
        if (stream.eatSpace()) {
          var attr = /^([\w\-]+)(=("(?<v>[^"]*)"|'(?<v>[^']*)'))?/.exec(state.nestState.originalString.slice(stream.pos));
          attr && (attr[2] ? searchInnerByAttrConf(attr) : searchInnerByAttrName(attr));
          return;
        }
        if (stream.next() === "=") return;
        stream.match(/^[\w\-]*/);
        return "attribute";
      },
      indent: (state, textAfter, fullLine) => state.indent,
    };

    return CodeMirror.nestingMode(
      main,
      ...subModes,
    );
  });
  
  CodeMirror.defineMode("@xml.block", function (cmConfig, tagConf) {
    return CodeMirror.nestingMode(
      CodeMirror.getMode(cmConfig, {...tagConf, name: "@xml.tag"}),
      {
        open: ">",
        close: new RegExp(`(?=(${tagConf.originClose.source}))`, "i"),
        start: () => tagConf.blockInnerConf,
        delimStyle: "tag",
        indent: (outer, startMatch) => /\S/.test(startMatch.input.slice(startMatch.index + 1 /* > */)) ? outer : outer + cmConfig.indentUnit,
      }
    )
  });

  CodeMirror.defineMode("xml", function (cmConfig, parserConfig) {
    if (parserConfig._compiled) {
      parserConfig = parserConfig._compiled
    } else {
      parserConfig.textMode ||= CodeMirror.getMode(cmConfig, "@xml.text")
      parserConfig.autoSelfClosers ||= []
      parserConfig.autoSelfClosers = new Set(parserConfig.autoSelfClosers)
      parserConfig.implicitlyClosed ||= []
      parserConfig.implicitlyClosed = new Set(parserConfig.implicitlyClosed)
      /*
      tagConfigs = [
        {
          tags: <iterable pattern>,
          ?defaultInnerMode: mode,
          ?innerModeByAttrs: [
            [attrPattern, valPattern|null, mode[, modeConfig]],
            ...
          ],
          ?defaultAttrMode: mode,
          ?defaultAttrModeConfig: obj,
          ?attrModes: [
            [attrPattern, mode[, modeConfig]],
            ...
          ],
        },
        ...
      ]
      */
      parserConfig.tagConfigs ||= []

      const _wordReStdCache = {}
      function wordReStd (pattern) {
        if (typeof pattern == "string") {
          return _wordReStdCache[pattern] || (_wordReStdCache[pattern] = new RegExp(`^${pattern}$`));
        } else return pattern;
      }
      
      const defaultTagConf = {
        defaultInnerMode: "xml",
        defaultInnerModeConfig: {_compiled: parserConfig},
        defaultAttrMode: "@xml.text",
        defaultAttrModeConfig: {},
      }
      
      for (var tagConf of parserConfig.tagConfigs) {
        for (var i = 0; i<tagConf.tags.length; i++) {
          if (typeof tagConf.tags[i] == "string") {
            tagConf.tags[i] = wordReStd(tagConf.tags[i])
          }
        }
        tagConf.defaultInnerMode ||= defaultTagConf.defaultInnerMode;
        tagConf.defaultInnerModeConfig ||= defaultTagConf.defaultInnerModeConfig;
        tagConf.defaultAttrMode ||= defaultTagConf.defaultAttrMode;
        tagConf.defaultAttrModeConfig ||= defaultTagConf.defaultAttrModeConfig;
        tagConf.innerByAttrName = []
        tagConf.innerByAttrConf = []
        for (var innerByAttr of tagConf.innerModeByAttrs || []) {
          innerByAttr[0] = wordReStd(innerByAttr[0])
          if (innerByAttr[1]) {
            innerByAttr[1] = wordReStd(innerByAttr[1])
            tagConf.innerByAttrConf.push(innerByAttr)
          } else {
            tagConf.innerByAttrName.push(innerByAttr)
          }
        }
        delete tagConf.innerModeByAttrs
      }
    }

    function getTagParserConfig (tag) {
      for (var tagConf of parserConfig.tagConfigs) {
        for (var tagPattern of tagConf.tags) {
          if (tagPattern.test(tag)) return tagConf;
        }
      }
    }
    
    const _implicitCloseCache = {}
    function implicitClose (tagReEsc) {
      return _implicitCloseCache[tagReEsc] 
      || (_implicitCloseCache[tagReEsc] = new RegExp(`(<\\/${tagReEsc}>)|(?=(<\\/?([A-Z_][\\w\\.\\-]*(?::[A-Z_][\\w\\.\\-]*)?)))`, "i"));
    }

    function getBlockConfig (startMatch, cm) {
      var tagConf = {
        tag: startMatch[1].toLowerCase(), 
        esc: undefined,
        blockInnerConf: {mode: undefined},
        parserConf: undefined,
      };
      tagConf.esc = RegExp.escape(tagConf.tag)
      tagConf.parserConf = getTagParserConfig(tagConf.tag) || defaultTagConf
      tagConf.blockInnerConf.mode = tagConf.parserConf.defaultInnerMode
      tagConf.blockInnerConf.modeConfig = tagConf.parserConf.defaultInnerModeConfig

      var blockConfig = {};

      if (parserConfig.autoSelfClosers.has(tagConf.tag)) {
        blockConfig.mode = CodeMirror.getMode(cm.options, {...tagConf, name: "@xml.tag"});
        blockConfig.close = /\/?>/;
      } else {
        if (parserConfig.implicitlyClosed.has(tagConf.tag)) {
          blockConfig.close = tagConf.originClose = implicitClose(tagConf.esc);
        } else {
          blockConfig.close = tagConf.originClose = new RegExp(`<\\/${tagConf.esc}>`, "i");
        }
        blockConfig.electricDelimiters = {
          configure: function (nestState, type) {
            if (type == "close") {
              // re indent close tags
              return this;
            } else {
              var tagBefore = nestState.subStack.get(-2);
              if (tagBefore && !tagBefore.endMatch[0]) {
                // tag before is implicitly closed -> re indent this open tag
                var openPattern = nestState.subStack.get(-1).conf.open,
                    testRe = new RegExp(`^\\s*${openPattern.source}`, openPattern.flags);
                return {...this, test: (docLine) => testRe.test(docLine)};
              }
            }
          }
        };
        blockConfig.mode = CodeMirror.getMode(cm.options, {...tagConf, name: "@xml.block"});
      }
      return blockConfig;
    }

    const xmlTagRe = /<([A-Z_][\w\.\-]*(?::[A-Z_][\w\.\-]*)?)/i

    return CodeMirror.nestingMode(
      parserConfig.textMode,
      {
        open: xmlTagRe,
        start: getBlockConfig,
        delimStyle: "tag",
      },
    )

  });

});
