// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/5/LICENSE

/**
 * CodeMirror - Nesting Mode Extension
 * -----------------------------------------------------------------------------
 * An extension for CodeMirror 5 that enables 
 * the nesting of modes for complex requirements.
 * 
 * This module sets `CodeMirror.nestingMode(mainMode, ...subModeConfigs)`
 * as a mode constructor.
 * 
 * Key Features:
 * 
 *  - MULTI-LEVEL NESTING
 *    nestingMode recognizes active nestingMode in subordinate area
 *    configurations recursively and always handles the currently active mode
 *    at the lowest level.
 * 
 *  - DYNAMIC SUB MODE CONFIGURATION
 *    The start of a sub mode can be defined as a character string 
 *    or as a regular expression. All further configurations can be 
 *    queried dynamically via a defined callback at runtime, 
 *    which receives a regex match that represents the start delimiter.
 * 
 *  - MODE RECURSIONS
 *    In the sub mode configuration, the mode for the area can be 
 *    defined as a string (Mode MIME or Name) which is only queried 
 *    internally when activated by CodeMirror.getMode.
 * 
 *  - LITERALS
 *    Special definitions of sub modes as literals or within non-literal sub 
 *    modes that prevent a mode from being exited.
 * 
 *  - SUFFIXES
 *    Suffixes can be defined in sub mode configurations that are 
 *    queried once after this sub mode has ended.
 *
 * Configuration:
 *
 * A main mode object must be passed as the first argument, and any number of
 * sub-mode configuration objects as the following arguments.
 * A sub mode configuration object can be configured according to the 
 * following patterns:
 *  Standard:
 *  - {open, mode [, modeConfig] [, start] [, close] [, literals] [, suffixes] [, innerStyle] [[, parseDelimiters] | [, tokenizeDelimiters] [, delimStyle]] [, comp]}
 *  Mode from Callback:
 *  - {*Standard, start: (match) → {*Standard, mode}}
 *  Literal:
 *  - {literal: true, open, [, start] [, close] [, literals] [, comp]}
 *  Suffix:
 * - {*Standard [, inline]}
 *
 *  Standard options for the sub mode configurations:
 *
 *    The following options define the basic concept of a sub mode.
 *
 *    open/close pattern configurations support regular expressions as 
 *    well as simple string literals whose character string is safely 
 *    converted internally into a regular expression. 
 *    A possible start callback therefore always receives a regex match.
 *    Open patterns must advance the parsing process, so the match must 
 *    consume characters. An exception is possible through the configuration 
 *    with parseDelimiters. Close patterns do not have to consume.
 *    Line break characters (\n) are not present in the data to be parsed. 
 *    However, an explicit newline character (\n) is passed to the open or 
 *    close regex to represent an empty line. The delimiter parser step 
 *    is skipped in that case.
 *
 *    - open: string | regexp
 *      (mandatory)
 *        Defines the start of the area of a sub mode as a string or regular 
 *        expression and must be present in every sub mode configuration.
 *
 *    - start: (Regexp Match Array) => SubConf Object
 *      (optional)
 *        Callback for a dynamic update of the configuration at runtime. 
 *        Is executed at the start of the defined area with the regex match of 
 *        the start delimiter. The returned object updates this configuration.
 *
 *    - mode: string | CodeMirror mode 
 *      (must be set after start at the latest)
 *        The mode for the defined area. Can be passed as an CodeMirror mode 
 *        object or as MIME or register name for creation at runtime. 
 *        In this case, the optional modeConfig option is used in 
 *        `CodeMirror.getMode(modeConfig || {}, mode)`.
 *
 *    - close: string | regexp
 *      (optional)
 *        Defines the end of the area of a sub mode as a string or regular 
 *        expression. If not set, it is automatically ended at the end of
 *        the line.
 *
 *  Advanced tokenization options:
 *
 *    These options can be used to define a general scope-related styling 
 *    of tokens of a sub area and to control the behavior of the parser in 
 *    relation to the area delimiters. 
 *    (these options are ignored in literal configurations)
 *
 *    By default, the delimiters are each parsed statically as an independent 
 *    token and provided with delimStyle if available.
 *    Possible combinations:
 *      - [ , innerStyle ] [ , delimStyle ] [ , tokenizeDelimiters ]
 *      - [ , innerStyle ] [ , parseDelimiters ]
 *
 *    - innerStyle: string
 *      (optional)
 *        A CSS class list that additionally precedes the class list of each 
 *        token within the area.
 *
 *    - delimStyle: string
 *      (optional)
 *        A CSS class name that is [additionally] prefixed to the delimiters of 
 *        the area. Internally, the following list prefixes are created: 
 *        `${delimStyle} ${delimStyle}-open `
 *        and `${delimStyle} ${delimStyle}-close `.
 *
 *    - tokenizeDelimiters: true
 *      (optional)
 *        If set, the contents of the delimiters are transferred in isolation 
 *        to the tokenization of the inner mode. 
 *        (additional prefixes can be defined via delimStyle)
 *
 *    - parseDelimiters: true
 *      (optional)
 *        If set, delimiters are seamlessly assigned to the inner area. 
 *        (delimStyle is ignored)
 *
 *  Special parser behavior configuration:
 *
 *    - literal: true
 *      (optional)
 *    - literals: Array[LiteralConfig, ...]
 *      (optional)
 *        Literal configurations enable a context-related definition of areas in
 *        which exiting a mode is prevented. An application example would be
 *        string literals that can potentially contain an open or close pattern.
 *
 *        Literal configurations can in themselves contain literal
 *        configurations (literals) for nesting. In the example, this can also
 *        ensure that the literal area is not terminated at a quote that is
 *        actually escaped with a backslash.
 *
 *        At the root level of the configurations, the literal flag must be set
 *        to true in order to define a literal configuration that can prevent
 *        leaving the main mode respectively the start of a sub mode.
 *
 *        In sub modes (also literal modes), an array of literal configurations
 *        can be defined that can prevent leaving the area.
 *
 *        Literal configurations evaluate the following options as described
 *        above: open, start, close, literals, comp.
 *
 *    - suffixes: Array[SuffixConfig, ...] 
 *      (optional)
 *        Suffix configurations can be assigned to a sub mode configuration, 
 *        which are queried once after the sub mode area is closed. 
 *        The configuration of suffixes supports each described option as a
 *        sub mode (for concatenations also the suffixes option).
 *        By default, the parser searches across blank lines and only discards
 *        all suffixes if they do not match even in a line with content.
 *        With `inline: true` it can be specified whether a suffix should also
 *        be discarded in blank lines if it does not match.
 *
 *    - comp: (thisMatch, otherMatch) => boolean 
 *      (optional)
 *        For a modified delimiter comparison function to control
 *        the delimiter priorities.
 *
 *        By default, the first match that occurs is preferred that
 *          - has the smallest index; 
 *          - or has an empty content;
 *          - or has the longest content.
 *
 *        This callback must return whether `thisMatch` has still a higher
 *        priority than `otherMatch`.
 *
 *        The transferred match objects are `RegExpMatchArray`'s in which
 *        additionally the attribute `conf` or `state` is set. `thisMatch` 
 *        is always a "startMatch" in which `conf` is set to the relevant 
 *        sub mode configuration.`otherMatch` can also be a "startMatch"
 *        when comparing with each other, or is an "endMatch" in which `state`
 *        is set to the current `nestingMode` state.
 *
 *        The order in which delimiters are potentially compared with each other
 *        is determined by the order in the configurations.
 * 
 * -----------------------------------------------------------------------------
 * Author: Adrian F. Hoefflin [srccircumflex]                          Nov. 2025
 */

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";


CodeMirror.nestingMode = new (class {
  version = "1.0";
  Conf = class {
    /* CONFIGURATION STANDARDIZATION */
    _makePattern(pattern) {return (typeof pattern == "string") ? new RegExp(RegExp.escape(pattern)) : pattern;}
    _closeAtSOL (stream, from) {return !from && stream.sol() && /^/.exec("");}
    _closeAtDlm (stream, from) {return CodeMirror.nestingMode.parserBase.searchDelimFrom(stream, this.close, from);}

    /**
     * The default delimiter comparison function.
     * Must return whether `thisMatch` has still a higher priority than `otherMatch`.
     * 
     * True by default 
     *  - if the index of `thisMatch` is smaller; 
     *  - or is equal and the consumed string is either equal or longer 
     *    then the string in `otherMatch`, except this string is completely empty;
     *  - or the consumed string is completely empty.
     * 
     * The transferred match objects are `RegExpMatchArray`'s in which
     * additionally the attribute `conf` or `state` is set.
     * `thisMatch` is always a "startMatch" in which `conf` is set to 
     * the relevant sub mode configuration.
     * `otherMatch` can also be a "startMatch" when comparing with each other, 
     * or is an "endMatch" in which `state` is set to the current `nestingMode` state.
     * 
     * The order in which they are compared is determined by the order in the configurations.
     */
    _compDefault (thisMatch, otherMatch) {
      if (thisMatch.index == otherMatch.index) {
        return !thisMatch[0] || thisMatch[0].length >= otherMatch[0].length && !!otherMatch[0];
      } else {
        return thisMatch.index < otherMatch.index;
      }
    }
    _tokenNOOP = (token) => token;
    __token_suf = (token) => token ? ` ${token}` : ``;
    _tokenInner (token) {return this.innerStyle + this.__token_suf(token);}
    _tokenOpen (token) {return this.delimStyleOpen + this.__token_suf(token);}
    _tokenClose (token) {return this.delimStyleClose + this.__token_suf(token);}

    constructor (conf) {
      Object.assign(this, conf)
      if (this.close == undefined) {
        this.searchClose = this._closeAtSOL;
      } else {
        this.close = this._makePattern(this.close);
        this.searchClose = this._closeAtDlm;
      }
      this.tokenOpen = this.tokenClose = this.tokenInner = this._tokenNOOP;
      if (this.literal) {
        this.parser = CodeMirror.nestingMode.literalParser;
      } else {
        if (this.parseDelimiters) {
          this.parser = CodeMirror.nestingMode.includeDelimParser;
        } else {
          if (this.delimStyle) {
            this.delimStyleOpen = `${this.delimStyle} ${this.delimStyle}-open`;
            this.delimStyleClose = `${this.delimStyle} ${this.delimStyle}-close`;
            this.tokenOpen = this._tokenOpen;
            this.tokenClose = this._tokenClose;
          }
          if (this.tokenizeDelimiters) {
            this.parser = CodeMirror.nestingMode.separateDelimParser;
          } else {
            this.parser = CodeMirror.nestingMode.staticDelimParser;
          }
        }
        if (this.innerStyle) this.tokenInner = this._tokenInner;
      }
      this.comp ||= this._compDefault;
      this.literals = this.literals ? [...this.literals] : []
    }

    _startSubMode () {
      this.mode = (typeof this.mode == "string") ? CodeMirror.getMode(this.modeConfig || {}, this.mode) : this.mode;
        // *@conf* [ mode: <mode> ] | [ mode: <string> [ , modeConfig: <object> ] ]
      if (this.mode) {
        CodeMirror.nestingMode.compileNestIgnoreAtMode(this.mode)
        this.literals.concat(this.mode.nestIgnore)
      }
      return this
    }

    _startConfDefault (match) {return new this.constructor(this)._startSubMode();}
    _startConfDynamic (match) {return new this.constructor({...this, ...this.start(match)})._startSubMode();}

    static withStart (conf) {
      conf = new CodeMirror.nestingMode.Conf(conf)
      conf.open = conf._makePattern(conf.open);
      conf.startConfig = conf.start ? conf._startConfDynamic : conf._startConfDefault;
      return conf;
    }

    static makeStruct (configs, clv, __literal) {
      return configs.map(conf => {
        conf.clv = clv;
        conf.literal ||= __literal;
        conf = CodeMirror.nestingMode.Conf.withStart(conf);
        if (conf.literals) {
          conf.literals = CodeMirror.nestingMode.Conf.makeStruct(conf.literals, clv + 1, true);
        }
        if (conf.suffixes) {
          conf.suffixes = CodeMirror.nestingMode.Conf.makeStruct(conf.suffixes, clv + 1);
        }
        return conf;
      })
    }
  };
  /* PARSERS > */
  parserBase = new (class {
    searchDelimFrom (stream, pattern, from) {return pattern.exec(stream.string.slice(from));}
    searchOpen (stream, configs, from) {
      var m, match;
      for (var conf of configs) {
        m = this.searchDelimFrom(stream, conf.open, from);
        if (m) {
          m.conf = conf;
          if (!match || !match.conf.comp(match, m)) match = m;
        }
      }
      return match;
    }
    checkStreamStringReset (stream, state) {
      if (stream.pos >= stream.string.length) {
        stream.string = state.originalString;
        return true;}}
    innerToken = (stream, state) => {return state.subConf.tokenInner(state.tokenGetter(stream, state.subState, state.subConf.mode));};
  });
  Main = class extends this.parserBase.constructor {
    constructor (mainMode, subModeConfigs) {
      super();
      this.mainMode = mainMode;
      CodeMirror.nestingMode.compileNestIgnoreAtMode(mainMode)
      this.subModeConfigs = CodeMirror.nestingMode.Conf.makeStruct(
        mainMode.nestIgnore ? subModeConfigs.concat(mainMode.nestIgnore.map(l => {l.literal = true; return l;})) : subModeConfigs,
        0,
      );
    }

    /**
     * Starts a sub mode when the cursor is at the position of the delimiter.
     * Possible steps:
     *  - (`entry` | `*<superior nestingMode>.continuation`) →
     *  - (`entry` | `*<superior nestingMode>.continuation`) → `preStartSub` → `untilOpen` →
     *  - → `<sub mode>.entry`
     */
    startSub = (stream, state) => {
      var startMatch = state.next.match;
      startMatch.index = 0;
        // fake update to the current cursor position;
        // processed in parser.entry;
        // generalization not possible, LiteralParser also processes distant matches
      state.subConf = startMatch.conf.startConfig(startMatch);
        // *@conf* [ start: (<regexMatch>) -> <object> ]
      state.next = undefined;

      if (state.subConf.literal) {
        // start literal
          // *@conf* [ literal: true ]
        state.subConf.mode = this.mainMode;
        state.subConf.parser = this;
        state.subState = state.mainState;
          // fake activation of a sub mode
        state.originalString = stream.string;
        state.parser = CodeMirror.nestingMode.literalParser.entry;
          // literalParser relations
      } else {
        // start sub mode
        var outerIndent = this.mainMode.indent?.(state.mainState, "", "");
        outerIndent = [undefined, CodeMirror.Pass].includes(outerIndent) ? 0 : outerIndent;
          // possible indentation from main mode
        state.subState = CodeMirror.startState(state.subConf.mode, outerIndent);
        state.parser = state.subConf.parser.entry;
      }
      return state.parser(
        stream, state, startMatch,
        stream.pos,  // searchCursor for LiteralParser.entry
      );
    };

    /**
     * Configures the parser for processing the remainder until the start of a sub mode.
     * Possible steps:
     *  - (`entry` | `*<superior nestingMode>.continuation`) →
     *  - → `untilOpen`
     */
    preStartSub = (stream, state) => {
      state.originalString = stream.string;
      stream.string = stream.string.slice(0, stream.pos + state.next.match.index);
      state.parser = this.untilOpen;
      return state.parser(stream, state);
    };

    /**
     * Processing the remainder until the start of a sub mode.
     * Possible steps:
     *  - (`entry` | `*<superior nestingMode>.continuation`) → `preStartSub` →
     *  - → `startSub`
     */
    untilOpen = (stream, state) => {
      var token = state.tokenGetter(stream, state.mainState, this.mainMode);
      if (this.checkStreamStringReset(stream, state)) {
        state.parser = this.startSub;
      }
      return token;
    };

    /**
     * Parse to the end of the line through the main mode.
     * Possible steps:
     *  - `entry` →
     *  - → `entry`
     */
    untilEOL = (stream, state) => {
      var token = state.tokenGetter(stream, state.mainState, this.mainMode);
      if (this.checkStreamStringReset(stream, state)) {
        state.parser = this.entry;
      }
      return token;
    };

    /**
     * Main entry point at line/parser start if no sub mode is active.
     * Possible steps:
     *  - → `preStartSub`
     *  - → `startSub`
     *  - → `untilEOL`
     */
    entry = (stream, state) => {
      if (this.regNextSub(stream, state)) {
        return state.next.run(stream, state);
          // preStartSub | startSub
      } else {
        state.originalString = stream.string;
        state.parser = this.untilEOL;
        return state.parser(stream, state);
      }
    };

    /**
     * Search from the current stream position for the start of a sub mode and register in `state.next` if available.
     *
     * Possible `state.next`: ```{
     *  match: <regexMatch(.conf:<subModeConfig>)>,
     *  run: startSub | preStartSub,
     * }```
     *
     * Called in `entry` or `<superior nestingMode>.continuation`.
     * @returns `true` if a start was found
     */
    regNextSub = (stream, state) => {
      var configs = this.subModeConfigs;
      if (state.suffixes) {
        // Search for suffixes that were registered at the time the previous configuration was closed (short validity period).
        // *@conf* [ suffixes: <Array[<subModeConfig>, ...]> ]
        configs = [...state.suffixes, ...configs];
      }
      var match = this.searchOpen(stream, configs, stream.pos)
      if (match) {
        state.next = {
          match: match,
          run: match.index ? this.preStartSub : this.startSub,
        };
      } else if (state.suffixes && stream.string === "\n") {
        state.suffixes = state.suffixes.filter(s => !s.inline)
      } else {
        state.suffixes = undefined;
      }
      return !!match;
    };

    /**
     * reset the parser state at the end of a sub mode
     */
    finally = (state) => {
      state.subConf = state.subState = null;
      state.parser = state.main.entry;
    }
  };
  literalParser = new (class extends this.parserBase.constructor {
    // Parser that prevents leaving a certain mode as long as a literal configuration is effective.
    // *@conf* @main [ literal: true ]
    // *@conf* @sub [ literals: Array[LiteralConfig, ...] ]
    
    getActiveLiteral = (state) => state.literals[state.literals.length - 1];
    
    /**
     * Configure the continuation of the literal parsing process depending on
     * a end or possible nested literal configuration.
     * Possible steps:
     *  - `entry` →
     *  - → `entry`
     *  - → `finalizeToMain`
     *  - → `*SubParser.continuation`
     */
    continuation = (stream, state, endMatch, searchCursor) => {
      var activeLiteral = this.getActiveLiteral(state);
      if (activeLiteral.literals) {
        // possibly nested
        var literalMatch = this.searchOpen(stream, activeLiteral.literals, searchCursor);
        endMatch.state = state
        if (literalMatch && literalMatch.conf.comp(literalMatch, endMatch)) {
          // the beginning of the found literal is before the end of this literal
          // (or has a greater significance at the same position)
          // -> extend stack
          return this.entry(stream, state, literalMatch, searchCursor);
        }
      }
      // confirmed end -> reduce stack
      state.literals.pop();
      if (state.literals.length) {
        // literal stack still active
        return this.checkEnd(stream, state, this.getActiveLiteral(state), searchCursor + endMatch.index + endMatch[0].length);
      } else if (activeLiteral.clv == 0) {
        // end of literal configuration from main mode level
        state.parser = this.finalizeToMain;
        stream.string = stream.string.slice(0, searchCursor + endMatch.index + endMatch[0].length);
        return state.parser(stream, state);
      } else {
        // end of sub mode literal
        searchCursor += endMatch.index + endMatch[0].length;
        return state.subConf.parser.continuation(stream, state, state.subConf.searchClose(stream, searchCursor), searchCursor);
      }
    };

    /**
     * Check for an end to the literal area.
     * Possible steps:
     *  - `entry` →
     *  - → `untilEOL`
     *  - → `*continuation`
     */
    checkEnd = (stream, state, activeLiteral, searchCursor) => {
      var literalEnd = activeLiteral.searchClose(stream, searchCursor);
      if (literalEnd) {
        return this.continuation(stream, state, literalEnd, searchCursor);
      } else {
        state.parser = this.untilEOL;
        return state.parser(stream, state);
      }
    };

    /**
     * Entrypoint.
     * Possible steps:
     *  - `SubParser.continuation` →
     *  - `MainParser.startSub` →
     *  - → `untilEOL`
     *  - → `*continuation`
     */
    entry = (stream, state, literalMatch, searchCursor) => {
      var activeLiteral = (
        !literalMatch.conf.clv ? 
          // literal config for main level is already started at MainParser.startSub
          literalMatch.conf 
        : literalMatch.conf.startConfig(literalMatch)
      );
      state.literals.push(activeLiteral);
      return this.checkEnd(stream, state, activeLiteral, searchCursor + literalMatch.index + literalMatch[0].length);
    };

    /**
     * Parse to the end of the line through the literal.
     * Possible steps:
     *  - `entry` →
     *  - `atSOL` →
     *  - → `atSOL`
     */
    untilEOL = (stream, state) => {
      var token = this.innerToken(stream, state);
      if (this.checkStreamStringReset(stream, state)) {state.parser = this.atSOL;}
      return token;
    };

    /**
     * Configure the continuation of the parsing process at start of line
     * (interface to `checkEnd`)
     * Possible steps:
     *  - `untilEOL` →
     *  - → `*continuation`
     */
    atSOL = (stream, state) => {
      state.originalString = stream.string;
      return this.checkEnd(stream, state, this.getActiveLiteral(state), 0);
    };

    /** finalize a main mode literal
     * Possible steps:
     *  - `*continuation` →
     *  - → `MainParser.entry`
     */
    finalizeToMain = (stream, state) => {
      var token = this.innerToken(stream, state);
      if (this.checkStreamStringReset(stream, state)) {
        state.mainState = state.subState;
          // Updating the main state.
          // ((i) Since the status is cached by line from CM as a copy, the reference is lost with multiline literal)
        state.main.finally(state);
      }
      return token;
    };
  });
  SubParserBase = class extends this.parserBase.constructor {
    /**
     * Configure the continuation of the parsing process depending on
     * a possible end of the active sub mode, the status of a possible
     * subordinate `nestingMode` or possible literal configuration.
     * Possible steps:
     *  - `atSOL` →
     *  - `entry` →
     *  - `*LiteralParser.continuation` →
     *  - → `LiteralParser.entry`
     *  - → `finalizeDirectDelim`
     *  - → `finalizeToNullDelim`
     *  - → `finalizeToDelim`
     *  - → `untilEOL`
     *  - → `untilSubInnerClose`
     *  - → `<subordinate nestingMode>.preStartSub`
     *  - → `<subordinate nestingMode>.startSub`
     *  - → `MainParser.entry`
     */
    continuation = (stream, state, endMatch, searchCursor) => {
      state.originalString = stream.string;

      if (state.subConf.mode.Nesting === CodeMirror.nestingMode) {
        // sub mode is a nestingMode
        if (state.subState.subConf || state.subState.next) {
          // active or designated sub mode in the subordinate nestingMode
          state.parser = this.untilSubInnerClose;
          return state.parser(stream, state);
        } else if (state.subState.main.regNextSub(stream, state.subState)) {
          // designated sub mode in the subordinate nestingMode found
          var next = state.subState.next;
          if (!endMatch || (endMatch.state = state) && next.match.conf.comp(next.match, endMatch)) {
            // the beginning of the found sub mode in the subordinate nestingMode is before the end of this mode
            // (or has a greater significance at the same position)
            return next.run(stream, state.subState);
              // preStartSub | startSub
          } else {
            // the beginning of the found sub mode has a lower significance, clean up for the next iteration
            state.subState.next = undefined;
          }
        }
      }
      if (state.subConf.literals) {
        // Search for literals that could prevent closure.
        // *@conf* [ literals: Array[LiteralConfig, ...] ]
        var literalMatch = this.searchOpen(stream, state.subConf.literals, searchCursor);
        if (literalMatch) {
          if (
            literalMatch 
            && (
              !endMatch 
              || ((endMatch.state = state) && literalMatch.conf.comp(literalMatch, endMatch))
            )
          ) {
            // the beginning of the found literal is before the end of this mode
            // (or has a greater significance at the same position)
            return literalMatch.conf.parser.entry(stream, state, literalMatch, searchCursor);
              // LiteralParser.entry
          }
        }
      }
      if (endMatch) {
        if (!endMatch.index && !searchCursor) {
          // closes directly at the current stream position
          if (!endMatch[0]) {
            // null token
            this.finally(state);
              // state.parser = MainParse.entry
          } else {
            stream.string = stream.string.slice(0, stream.pos + endMatch[0].length);
            state.parser = this.finalizeDirectDelim;
          }
        } else if (!endMatch[0]) {
          // null token
          this.setFinalString(stream, endMatch, searchCursor);
          state.parser = this.finalizeToNullDelim;
        } else {
          this.setFinalString(stream, endMatch, searchCursor);
          state.parser = this.finalizeToDelim;
        }
      } else {
        // active at least until end of line
        state.parser = this.untilEOL;
      }
      return state.parser(stream, state);
    };

    /** (abstract) set the final string in the stream at designated sub mode end */
    setFinalString = (stream, endMatch, from) => {};

    /** (abstract) finalize the sub mode at distant delimiter
     * Possible steps:
     *  - `*continuation` →
     *  - → `delimClose`
     *  - → `entry`
     */
    finalizeToDelim = (stream, state) => {};

    /**
     * (abstract) finalize the sub mode at immediate delimiter
     * Possible steps:
     *  - `*continuation` →
     *  - → `delimClose`
     *  - → `entry`
     */
    finalizeDirectDelim = (stream, state) => {};

    /** (abstract) finalize the sub mode at null delimiter
     * Possible steps:
     *  - `*continuation` →
     *  - → `delimClose`
     *  - → `entry`
     */
    finalizeToNullDelim = (stream, state) => {};

    /**
     * (abstract) entry point of the sub mode parser
     * Possible steps:
     *  - `startSub` →
     *  - → `atSOL`
     *  - → `delimOpen`
     *  - → `*continuation`
     */
    entry = (stream, state, startMatch) => {};

    /**
     * Parse to the end of the line through the active sub mode.
     * Possible steps:
     *  - `*continuation` →
     *  - `*LiteralParser.continuation` →
     *  - → `atSOL`
     */
    untilEOL = (stream, state) => {
      var token = this.innerToken(stream, state);
      if (this.checkStreamStringReset(stream, state)) {state.parser = this.atSOL;}
      return token;
    };

    /**
     * Parse through the active sub mode until its sub mode is inactive.
     * Possible steps:
     *  - `*continuation` →
     *  - `*LiteralParser.continuation` →
     *  - → `atSOL`
     */
    untilSubInnerClose = (stream, state) => {
      var token = this.innerToken(stream, state);
      if (!(state.subState.subConf || state.subState.next)) {state.parser = this.atSOL;}
      return token;
    };

    /**
     * Configure the continuation of the parsing process at start of line
     * (interface to `continuation`)
     * Possible steps:
     *  - `untilEOL` →
     *  - `untilSubInnerClose` →
     *  - `SeparateDelimParser.delimOpen` →
     *  - `StaticDelimParser.entry` →
     *  - → `*continuation`
     */
    atSOL = (stream, state) => {
      return this.continuation(stream, state, state.subConf.searchClose(stream, stream.pos), stream.pos);
    };

    /**
     * Reset the parser state at the end of the sub mode and register possible suffix configurations for the following iteration.
     */
    finally = (state) => {
      state.suffixes = state.subConf.suffixes;
      state.main.finally(state);
    };
  };
  includeDelimParser = new (class extends this.SubParserBase {
    // Sub mode parser that includes the content of the delimiter seamlessly for tokenization.
    // *@conf* [ includeDelimiters: true ]

    setFinalString = (stream, endMatch, from) => {stream.string = stream.string.slice(0, from + endMatch.index + endMatch[0].length);};
    entry = (stream, state, startMatch) => {
      var searchCursor = stream.pos + startMatch.index + startMatch[0].length;
      return this.continuation(
        stream,
        state,
        state.subConf.searchClose(stream, searchCursor),
        searchCursor,
      );
    };
    finalizeToDelim = (stream, state) => {
      var token = this.innerToken(stream, state);
      if (this.checkStreamStringReset(stream, state)) {this.finally(state);}
      return token;
    };
    finalizeDirectDelim = this.finalizeToDelim;
    finalizeToNullDelim = this.finalizeToDelim;
  });
  separateDelimParser = new (class extends this.SubParserBase {
    // Sub mode parser that transfers the content of the delimiter separately to the tokenization.
    // *@conf* [ parseDelimiters: true [ , delimStyle: <string> ] ]

    setFinalString = (stream, endMatch, from) => {
      stream.string = stream.string.slice(0, from + endMatch.index);
    };
    delimOpen = (stream, state) => {
      var token = state.subConf.tokenOpen(state.tokenGetter(stream, state.subState, state.subConf.mode));
      if (this.checkStreamStringReset(stream, state)) {state.parser = this.atSOL;}
      return token;
    };
    delimClose = (stream, state) => {
      var token = state.subConf.tokenClose(state.tokenGetter(stream, state.subState, state.subConf.mode));
      if (this.checkStreamStringReset(stream, state)) {this.finally(state);}
      return token;
    };
    entry = (stream, state, startMatch) => {
      state.originalString = stream.string;
      stream.string = stream.string.slice(0, stream.pos + startMatch.index + startMatch[0].length);
      state.parser = this.delimOpen;
      return state.parser(stream, state);
    };
    finalizeToDelim = (stream, state) => {
      var token = this.innerToken(stream, state);
      if (this.checkStreamStringReset(stream, state)) {
        state.originalString = stream.string;
        var endMatch = state.subConf.searchClose(stream, stream.pos);
        stream.string = stream.string.slice(0, stream.pos + endMatch.index + endMatch[0].length);
        state.parser = this.delimClose;
      }
      return token;
    };
    finalizeDirectDelim = this.delimClose;
    finalizeToNullDelim = (stream, state) => {
      var token = this.innerToken(stream, state);
      if (this.checkStreamStringReset(stream, state)) {this.finally(state);}
      return token;
    };
  });
  staticDelimParser = new (class extends this.separateDelimParser.constructor {
    // Sub mode parser that statically tokenizes the content of the delimiter (default).
    // *@conf* [ [ delimStyle: <string> ] ]

    entry = (stream, state, startMatch) => {
      state.originalString = stream.string;
      stream.pos += startMatch[0].length;
      state.parser = this.atSOL;
      return state.subConf.delimStyleOpen;
    };
    delimClose = (stream, state) => {
      var endMatch = state.subConf.searchClose(stream, stream.pos);
      stream.pos += endMatch[0].length;
      var token = state.subConf.delimStyleClose;
      stream.string = state.originalString;
      this.finally(state);
      return token;
    };
    finalizeToDelim = (stream, state) => {
      var token = this.innerToken(stream, state);
      if (this.checkStreamStringReset(stream, state)) {
        state.originalString = stream.string;
        var endMatch = state.subConf.searchClose(stream, stream.pos);
        stream.string = stream.string.slice(0, stream.pos + endMatch.index + endMatch[0].length);
        state.parser = this.delimClose;
      }
      return token;
    };
    finalizeDirectDelim = this.delimClose;
  });
  TokenGetters = {
    default: function (stream, modeState, mode) {return mode.token(stream, modeState, this /*: nestState */)},
    blankLine: (stream) => stream.pos = 1,
  };
  /* < PARSERS */

  NestIgnoreCaches = new (class {
    lineComments = {};
    blockComments = {};
    strings = {};
  })
  compileNestIgnoreAtMode (mode) {
    var compile = (literal) => CodeMirror.nestingMode.Conf.makeStruct(
      [literal], 
      Infinity, // clv irrelevant
      true  // is literal
    )[0];
    mode.nestIgnore ||= [];
    if (!mode.nestIgnore.compiled) {
      mode.nestIgnore.compiled = true
      if (mode.stringQuotes) {
        var k = mode.stringQuotes;
        if (mode.stringEscape) k += "\0" + mode.stringEscape;
        var conf = this.NestIgnoreCaches.strings[k];
        if (!conf) {
          conf = compile({
            open: new RegExp(mode.stringQuotes.split("").map(x => RegExp.escape(x)).join("|")), 
            start: (m) => RegExp.escape(m[0]),
          });
          this.NestIgnoreCaches.strings[k] = conf;
          if (mode.stringEscape) {
            conf.literals = [compile({
              open: new RegExp(RegExp.escape(mode.stringEscape) + "(.|$)"),
              close: "",
              innerStyle: "esc",
            })];
          }
        }
        mode.nestIgnore.push(conf);
      }
      if (mode.lineComment) {
          var lC = (k) => {
            mode.nestIgnore.push(
              this.NestIgnoreCaches.lineComments[k]
              || (this.NestIgnoreCaches.lineComments[k] = compile({open: k}))
            );
          }
          typeof mode.lineComment == "array" ? mode.lineComment.forEach(lC) : lC(mode.lineComment);
        }
      if (mode.blockCommentStart) {    
        var k = `${mode.blockCommentStart}\0${mode.blockCommentEnd}`
        mode.nestIgnore.push(
          this.NestIgnoreCaches.blockComments[k] 
          || (this.NestIgnoreCaches.blockComments[k] = compile({open: mode.blockCommentStart, close: mode.blockCommentEnd}))
        );
      }
    }
  }

  constructor () {
    const nestingMode = (mainMode, ...subModeConfigs) => {
      const main = new this.Main(mainMode, subModeConfigs);
      /* EXPORTS > */
      return {
        Nesting: CodeMirror.nestingMode, 
          // flag

        startState: function(outerIndent) {
          return {
            mainState: CodeMirror.startState(mainMode, outerIndent),
            subConf: null,
            subState: null,
            parser: main.entry,
            suffixes: null,
            literals: [],
            main: main,
            tokenGetter: CodeMirror.nestingMode.TokenGetters.default,
          };
        },

        copyState: function(state) {
          return {
            mainState: CodeMirror.copyState(mainMode, state.mainState),
            subConf: state.subConf,
            subState: state.subConf && CodeMirror.copyState(state.subConf.mode, state.subState),
            parser: state.parser,
            suffixes: state.suffixes,
            literals: state.literals.map(l => {return {...l}}),
            originalString: state.originalString,
            main: main,
            tokenGetter: state.tokenGetter,
          };
        },

        token: function(stream, state) {return state.parser(stream, state);},

        indent: function(state, textAfter, line) {
          var mode = state.subConf ? state.subConf.mode : mainMode;
          if (!mode.indent) return CodeMirror.Pass;
          return mode.indent(state.subConf ? state.subState : state.mainState, textAfter, line);
        },

        blankLine: function(state) {
          // executes only one action for a blank line: 
          //  - closes a sub mode whose `close` is not defined (close at SOL by default), 
          //  - closes a sub mode whose `close` matches "\n", 
          //  - or starts a sub mode whose open matches "\n".
          if (state.subConf) {
            if (state.subConf.mode.Nesting !== CodeMirror.nestingMode) {
              state.tokenGetter = this.Nesting.TokenGetters.blankLine;
            }
            state.subConf.mode.blankLine?.(state.subState);
          } else {
            mainMode.blankLine?.(state.mainState);
            state.tokenGetter = this.Nesting.TokenGetters.blankLine;
          }
          state.parser(
            {string: "\n", pos: 0, sol: () => true},
            state,
          );
          state.tokenGetter = this.Nesting.TokenGetters.default;
        },

        electricChars: mainMode.electricChars,

        innerMode: function(state) {
          if (state.subConf) {
            if (state.subConf.mode.innerMode) {
              return state.subConf.mode.innerMode(state.subState);
            } else {
              return {state: state.subState, mode: state.subConf.mode};
            }
          } else {
            return {state: state.mainState, mode: mainMode};
          }
        },
      };
      /* < EXPORTS */
    };
    Object.setPrototypeOf(nestingMode, new.target.prototype);
    Object.assign(nestingMode, this);
    return nestingMode;
  }
})();


CodeMirror.multiplexingMode = CodeMirror.nestingMode;
  // backwards compatibility
});
