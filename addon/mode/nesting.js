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
 *  - MASKS
 *    Special definitions of sub modes as masks or within non-mask sub 
 *    modes that prevent a mode from being exited.
 * 
 *  - SUFFIXES
 *    Suffixes can be defined in sub mode configurations that are 
 *    queried once after this sub mode has ended.
 *
 * Glossary:
 * 
 *  - "startMatch" / "endMatch"
 *    The processed delimiter match objects are `RegExpMatchArray`s, where in
 *    addition the attribute `originalIndex` and `conf` for “startMatch” or 
 *    `state` for “endMatch” is set. `conf` contains the relevant sub mode 
 *    configuration, `state` the current `nestingMode` status.
 *    `originalIndex` represents a backup of the original RegExpMatchArray.index, 
 *    as this field is corrupted internally.
 * 
 *  - "nestState"
 *    //todo
 * 
 * Configuration:
 *
 * A main mode object must be passed as the first argument, and any number of
 * sub-mode configuration objects as the following arguments.
 * A sub mode configuration object can be configured according to the 
 * following patterns:
 *  Standard:
 *  - {
 *      open, 
 *      mode 
 *      [, modeConfig] 
 *      [, start] 
 *      [, indent] 
 *      [, close] 
 *      [, masks] 
 *      [, suffixes] 
 *      [, innerStyle] 
 *      [, parseDelimiters (a)]
 *      [, tokenizeDelimiters (b)]
 *      [, delimStyle (b)] 
 *      [, electricDelimiters (b)]
 *      [, indent ]
 *      [, comp]
 *    }
 *  Mode from Callback:
 *  - {*Standard, start: (startMatch) → {*Standard, mode}}
 *  mask:
 *  - {mask: true, open, [, start] [, close] [, masks] [, comp]}
 *  Suffix:
 * - {*Standard [, inline]}
 *
 *  Standard Options for the Sub Mode Configurations:
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
 *    - indent: (outer, startMatch, state) => indent|undefined|CodeMirror.Pass
 *      (optional)
 *        Callback for an indentation request at sub mode start.
 *        `outer` is the current indentation of the main mode and can be 
 *        undefined, CodeMirror.Pass or an integer. `startMatch` is the 
 *        match of the start delimiter. `state` is the `nestingMode` state.
 *        If `undefined` or `CodeMirror.Pass` is returned, 
 *        the indentation is set to `0`.
 *
 *    - mode: spec | CodeMirror mode 
 *      (must be set after start at the latest)
 *        The mode for the defined area. Can be passed as an CodeMirror mode 
 *        object or as MIME or register name for creation at runtime. 
 *        In this case, the optional modeConfig option is used in 
 *        `CodeMirror.getMode(cm.options, {name: mode, ...modeConfig})`.
 *
 *    - close: string | regexp
 *      (optional)
 *        Defines the end of the area of a sub mode as a string or regular 
 *        expression. If not set, it is automatically ended at the end of
 *        the line.
 *
 *  Advanced Tokenization Options:
 *
 *    These options can be used to define a general scope-related styling 
 *    of tokens of a sub area and to control the behavior of the parser in 
 *    relation to the area delimiters. 
 *    (these options are ignored in mask configurations)
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
 *    - tokenizeDelimiters: true|mode object|mode spec
 *      (optional)
 *        If set, the contents of the delimiters are transferred in isolation 
 *        to the tokenization of the inner or specific mode. 
 *        (additional prefixes can be defined via delimStyle)
 *
 *    - parseDelimiters: true
 *      (optional)
 *        If set, delimiters are seamlessly assigned to the inner area. 
 *        (delimStyle is ignored)
 *
 *  Special Parser Behavior Configuration:
 *
 *    - mask: true
 *      (optional)
 *    - masks: Array[MaskConfig, ...]
 *      (optional)
 *        Mask configurations enable a context-related definition of areas in
 *        which exiting a mode is prevented. An application example would be
 *        string literals that can potentially contain an open or close pattern.
 *
 *        Mask configurations can in themselves contain mask
 *        configurations (masks) for nesting. In the example, this can also
 *        ensure that the mask area is not terminated at a quote that is
 *        actually escaped with a backslash.
 *
 *        At the root level of the configurations, the mask flag must be set
 *        to true in order to define a mask configuration that can prevent
 *        leaving the main mode respectively the start of a sub mode.
 *
 *        In sub modes (also mask modes), an array of mask configurations
 *        can be defined that can prevent leaving the area.
 *
 *        Mask configurations evaluate the following options as described
 *        above: open, start, close, masks, comp.
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
 *        `thisMatch` is always a "startMatch". `otherMatch` can also be a 
 *        "startMatch" when comparing with each other, or is an "endMatch".
 *
 *        The order in which delimiters are potentially compared with each other
 *        is determined by the order in the configurations.
 * 
 * Advanced Editing Configuration:
 * 
 *    - indent: (outerIndent, startMatch) → indent|Pass
 *      (optional)
 *        Query an indent for the inner area. The result is passed as the 
 *        first argument to startState of the sub mode.
 *        `outerIndent` is the return value of `indent()` from `mainMode` or 
 *        is `undefined` if not available.
 * 
 *    - electricDelimiters: true|{ [ configure: (nestState, delimType) → object:this|null ] [ , test: (docLine) → boolean ] [ , indent: (nestState, textAfter, docLine) → indent|Pass ] }
 *      (optional)
 *        Dynamic re-indentation of lines with delimiters 
 *        (not compatible with `parseDelimiters`).
 *        Passing `true` automatically configures the default behavior: 
 *          Lines with end delimiters are equipped with the indent of the 
 *          `mainMode`.
 *        The transfer of an object overwrites the fields of the standard 
 *        configuration:
 *          - configure: 
 *              Is executed after a delimiter has been parsed. 
 *              `delimType` is `"open"` or `"close"`, the return value 
 *              must be a [updated] object of the own type or null for skip.
 *          - test: 
 *              Receives the document line and checks whether a 
 *              re-indentation should take place.
 *          - indent: 
 *              Works like `indent()` of a mode object and must return the 
 *              indentation of the line.
 *        
 *      
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
      if (this.mask) {
        this.parser = CodeMirror.nestingMode.maskParser;
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
            if (typeof this.tokenizeDelimiters == "boolean") {
              this.parser = CodeMirror.nestingMode.separateDelimParser;
            } else {
              this.parser = CodeMirror.nestingMode.tokenizeDelimParser;
            }
          } else {
            this.parser = CodeMirror.nestingMode.staticDelimParser;
          }
        }
        if (this.innerStyle) this.tokenInner = this._tokenInner;
        this.indent ||= (indent) => indent;
      }
      this.comp ||= this._compDefault;
      this.masks = this.masks ? [...this.masks] : []
      if (!this.electricDelimiters) {
        this.electricDelimiters = {configure: () => undefined};
      } else {
        const electricDelimitersDefaults = {
          _testRe: new RegExp(`^\\s*${this.close.source}`, this.close.flags),
          test: function (docLine) {return this._testRe.test(docLine)},
          indent: (state, textAfter, line) => state.main.mode.indent?.(state.mainState),
          configure: function (state, type) {return type == "close" ? this : undefined;}
        }
        if (this.electricDelimiters === true) {
          this.electricDelimiters = electricDelimitersDefaults;
        } else {
          this.electricDelimiters = {...electricDelimitersDefaults, ...this.electricDelimiters}
        }
      }
    }

    _startSubMode (cm) {
      this.mode = (typeof this.mode == "string") ? CodeMirror.getMode(cm.options, this.modeConfig ? {name: this.mode, ...this.modeConfig} : this.mode) : this.mode;
        // *@conf* [ mode: <mode> ] | [ mode: <string> [ , modeConfig: <object> ] ]
      if (this.mode) {
        CodeMirror.nestingMode.compileNestMasksAtMode(this.mode)
        this.masks.concat(this.mode.nestMasks)
      }
      return this
    }

    _startConfDefault (cm, match) {return new this.constructor(this)._startSubMode(cm);}
    _startConfDynamic (cm, match) {return new this.constructor({...this, ...this.start(match, cm)})._startSubMode(cm);}

    static withStart (conf) {
      conf = new CodeMirror.nestingMode.Conf(conf)
      conf.open = conf._makePattern(conf.open);
      conf.startConfig = conf.start ? conf._startConfDynamic : conf._startConfDefault;
      return conf;
    }

    static makeStruct (configs, clv, __mask) {
      return configs.map(conf => {
        conf.clv = clv;
        conf.mask ||= __mask;
        conf = CodeMirror.nestingMode.Conf.withStart(conf);
        if (conf.masks) {
          conf.masks = CodeMirror.nestingMode.Conf.makeStruct(conf.masks, clv + 1, true);
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
  maskParser = new (class extends this.parserBase.constructor {
    // Parser that prevents leaving a certain mode as long as a mask configuration is effective.
    // *@conf* @main [ mask: true ]
    // *@conf* @sub [ masks: Array[MaskConfig, ...] ]
    
    getActiveMask = (state) => state.masks[state.masks.length - 1];
    
    /**
     * Configure the continuation of the mask parsing process depending on
     * a end or possible nested mask configuration.
     * Possible steps:
     *  - `entry` →
     *  - → `entry`
     *  - → `finalizeToMain`
     *  - → `*SubParser.continuation`
     */
    continuation = (stream, state, endMatch, searchCursor) => {
      var activeMask = this.getActiveMask(state);
      if (activeMask.masks.length) {
        // possibly nested
        var maskMatch = this.searchOpen(stream, activeMask.masks, searchCursor);
        endMatch.state = state
        if (maskMatch && maskMatch.conf.comp(maskMatch, endMatch)) {
          // the beginning of the found mask is before the end of this mask
          // (or has a greater significance at the same position)
          // -> extend stack
          return this.entry(stream, state, maskMatch, searchCursor);
        }
      }
      // confirmed end -> reduce stack
      state.masks.pop();
      if (state.masks.length) {
        // mask stack still active
        return this.checkEnd(stream, state, this.getActiveMask(state), searchCursor + endMatch.index + endMatch[0].length);
      } else if (activeMask.clv == 0) {
        // end of mask configuration from main mode level
        state.parser = this.finalizeToMain;
        stream.string = stream.string.slice(0, searchCursor + endMatch.index + endMatch[0].length);
        return state.parser(stream, state);
      } else {
        // end of sub mode mask
        searchCursor += endMatch.index + endMatch[0].length;
        state.subConf.parser.regEnd(stream, state, searchCursor);
        return state.subConf.parser.continuation(stream, state, searchCursor);
      }
    };

    /**
     * Check for an end to the mask area.
     * Possible steps:
     *  - `entry` →
     *  - → `untilEOL`
     *  - → `*continuation`
     */
    checkEnd = (stream, state, activeMask, searchCursor) => {
      var maskEnd = activeMask.searchClose(stream, searchCursor);
      if (maskEnd) {
        return this.continuation(stream, state, maskEnd, searchCursor);
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
    entry = (stream, state, maskMatch, searchCursor) => {
      var activeMask = (
        !maskMatch.conf.clv ? 
          // mask config for main level is already started at MainParser.startSub
          maskMatch.conf 
        : maskMatch.conf.startConfig(state.main.cm, maskMatch)
      );
      state.masks.push(activeMask);
      return this.checkEnd(stream, state, activeMask, searchCursor + maskMatch.index + maskMatch[0].length);
    };

    /**
     * Parse to the end of the line through the mask.
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
      return this.checkEnd(stream, state, this.getActiveMask(state), 0);
    };

    /** finalize a main mode mask
     * Possible steps:
     *  - `*continuation` →
     *  - → `MainParser.entry`
     */
    finalizeToMain = (stream, state) => {
      var token = this.innerToken(stream, state);
      if (this.checkStreamStringReset(stream, state)) {
        state.mainState = state.subState;
          // Updating the main state.
          // ((i) Since the status is cached by line from CM as a copy, the reference is lost with multiline mask)
        state.main.topParser.finally(state);
      }
      return token;
    };
  });
  SubParserBase = class extends this.parserBase.constructor {
    /**
     * Configure the continuation of the parsing process depending on
     * a possible end of the active sub mode, the status of a possible
     * subordinate `nestingMode` or possible mask configuration.
     * Possible steps:
     *  - `atSOL` →
     *  - `entry` →
     *  - `*MaskParser.continuation` →
     *  - → `MaskParser.entry`
     *  - → `finalizeDirectDelim`
     *  - → `finalizeToNullDelim`
     *  - → `finalizeToDelim`
     *  - → `untilEOL`
     *  - → `untilSubInnerClose`
     *  - → `<subordinate nestingMode>.preStartSub`
     *  - → `<subordinate nestingMode>.startSub`
     *  - → `MainParser.entry`
     */
    continuation = (stream, state, searchCursor) => {
      state.originalString = stream.string;

      if (state.subConf.mode.Nesting === CodeMirror.nestingMode) {
        // sub mode is a nestingMode
        if (state.subState.subConf || state.subState.next) {
          // active or designated sub mode in the subordinate nestingMode
          state.parser = this.untilSubInnerClose;
          return state.parser(stream, state);
        } else if (state.subState.main.topParser.regNextSub(stream, state.subState)) {
          // designated sub mode in the subordinate nestingMode found
          var next = state.subState.next;
          if (!state.endMatch || (state.endMatch.state = state) && next.match.conf.comp(next.match, state.endMatch)) {
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
      if (state.subConf.masks.length) {
        // Search for masks that could prevent closure.
        // *@conf* [ masks: Array[MaskConfig, ...] ]
        var maskMatch = this.searchOpen(stream, state.subConf.masks, searchCursor);
        if (maskMatch) {
          if (
            maskMatch 
            && (
              !state.endMatch 
              || ((state.endMatch.state = state) && maskMatch.conf.comp(maskMatch, state.endMatch))
            )
          ) {
            // the beginning of the found mask is before the end of this mode
            // (or has a greater significance at the same position)
            return maskMatch.conf.parser.entry(stream, state, maskMatch, searchCursor);
              // MaskParser.entry
          }
        }
      }
      if (state.endMatch) {
        if (!state.endMatch.index && !searchCursor) {
          // closes directly at the current stream position
          if (!state.endMatch[0]) {
            // null token
            this.finally(state);
              // state.parser = MainParse.entry
            if (state.nestLv) {
              // is not root
              return CodeMirror.Pass;
                // handle null token at parent nest
            }
          } else {
            stream.string = stream.string.slice(0, stream.pos + state.endMatch[0].length);
            state.parser = this.finalizeDirectDelim;
          }
        } else if (!state.endMatch[0]) {
          // null token
          this.setFinalString(stream, state);
          state.parser = this.finalizeToNullDelim;
        } else {
          this.setFinalString(stream, state);
          state.parser = this.finalizeToDelim;
        }
      } else {
        // active at least until end of line
        state.parser = this.untilEOL;
      }
      return state.parser(stream, state);
    };

    /** (abstract) set the final string in the stream at designated sub mode end */
    setFinalString = (stream, state) => {};

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
     *  - `*MaskParser.continuation` →
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
     *  - `*MaskParser.continuation` →
     *  - → `atSOL`
     */
    untilSubInnerClose = (stream, state) => {
      var token = this.innerToken(stream, state);
      if (!(state.subState.subConf || state.subState.next)) {
        if (token === CodeMirror.Pass) {
          // null token
          return this.atSOL(stream, state)
        }
        state.parser = this.atSOL;
      }
      return token;
    };

    regEnd = (stream, state, cur) => {
      state.endMatch = state.subConf.searchClose(stream, cur);
      if (state.endMatch) state.endMatch.cur = cur;
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
      this.regEnd(stream, state, stream.pos);
      return this.continuation(stream, state, stream.pos);
    };

    /**
     * Reset the parser state at the end of the sub mode and register possible suffix configurations for the following iteration.
     */
    finally = (state) => {
      state.suffixes = state.subConf.suffixes;
      state.subStack._end(state)
      state.main.topParser.finally(state);
    };
  };
  includeDelimParser = new (class extends this.SubParserBase {
    // Sub mode parser that includes the content of the delimiter seamlessly for tokenization.
    // *@conf* [ parseDelimiters: true ]

    setFinalString = (stream, state) => {stream.string = stream.string.slice(0, state.endMatch.cur + state.endMatch.index + state.endMatch[0].length);};
    entry = (stream, state, startMatch) => {
      var searchCursor = stream.pos + startMatch.index + startMatch[0].length;
      this.regEnd(stream, state, searchCursor);
      return this.continuation(stream, state, searchCursor);
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
    // *@conf* [ tokenizeDelimiters: true [ , delimStyle: <string> ] ]

    delimLeave = (state, type) => {
      state.electricDelimiters = state.subConf.electricDelimiters.configure(state, type);
    };
    _finally = this.finally;
    finally = (state) => {
      this.delimLeave(state, "close");
      this._finally(state);
    };
    setFinalString = (stream, state) => {
      stream.string = stream.string.slice(0, state.endMatch.cur + state.endMatch.index);
    };
    delimToken = (stream, state) => state.tokenGetter(stream, state.subState, state.subConf.mode);
    delimOpen = (stream, state) => {
      var token = state.subConf.tokenOpen(this.delimToken(stream, state));
      if (this.checkStreamStringReset(stream, state)) {
        this.delimLeave(state, "open");
        state.parser = this.atSOL;
      }
      return token;
    };
    delimClose = (stream, state) => {
      var token = state.subConf.tokenClose(this.delimToken(stream, state));
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
        this.regEnd(stream, state, stream.pos);
        stream.string = stream.string.slice(0, stream.pos + state.endMatch.index + state.endMatch[0].length);
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
  tokenizeDelimParser = new (class extends this.separateDelimParser.constructor {
    // Sub mode parser that transfers the content of the delimiter separately to the tokenization.
    // *@conf* [ tokenizeDelimiters: mode [ , delimStyle: <string> ] ]

    delimToken = (stream, state) => state.tokenGetter(stream, state.delimState, state.delimMode);
    _entry = this.entry;
    entry = (stream, state, startMatch) => {
      state.delimMode = typeof state.subConf.tokenizeDelimiters == "string" ? CodeMirror.getMode(state.main.cm.options, state.subConf.tokenizeDelimiters) : state.subConf.tokenizeDelimiters;
      state.delimState = CodeMirror.startState(state.delimMode);
      return this._entry(stream, state, startMatch);
    };
  });
  staticDelimParser = new (class extends this.separateDelimParser.constructor {
    // Sub mode parser that statically tokenizes the content of the delimiter (default).
    // *@conf* [ [ delimStyle: <string> ] ]

    entry = (stream, state, startMatch) => {
      state.originalString = stream.string;
      stream.pos += startMatch[0].length;
      state.parser = this.atSOL;
      this.delimLeave(state, "open")
      return state.subConf.delimStyleOpen;
    };
    delimClose = (stream, state) => {
      stream.pos += state.endMatch[0].length;
      var token = state.subConf.delimStyleClose;
      stream.string = state.originalString;
      this.finally(state);
      return token;
    };
    finalizeDirectDelim = this.delimClose;
  });
  TokenGetters = {
    default: function (stream, modeState, mode) {return mode.token(stream, modeState, this /*: nestState */)},
    blankLine: (stream) => stream.pos = 1,
  };
  /* < PARSERS */

  NestMasksCaches = new (class {
    lineComments = {};
    blockComments = {};
    strings = {};
  })
  compileNestMasksAtMode (mode) {
    var compile = (mask) => CodeMirror.nestingMode.Conf.makeStruct(
      [mask], 
      Infinity, // clv irrelevant
      true  // is mask
    )[0];
    mode.nestMasks ||= [];
    if (!mode.nestMasks.compiled) {
      mode.nestMasks.compiled = true
      if (mode.stringQuotes) {
        var k = mode.stringQuotes;
        if (mode.stringEscape) k += "\0" + mode.stringEscape;
        var conf = this.NestMasksCaches.strings[k];
        if (!conf) {
          conf = compile({
            open: new RegExp(mode.stringQuotes.split("").map(x => RegExp.escape(x)).join("|")), 
            start: (m) => {return {close: m[0]}},
          });
          this.NestMasksCaches.strings[k] = conf;
          if (mode.stringEscape) {
            conf.masks = [compile({
              open: new RegExp(RegExp.escape(mode.stringEscape) + "(.|$)"),
              close: "",
              innerStyle: "esc",
            })];
          }
        }
        mode.nestMasks.push(conf);
      }
      if (mode.lineComment) {
          var lC = (k) => {
            mode.nestMasks.push(
              this.NestMasksCaches.lineComments[k]
              || (this.NestMasksCaches.lineComments[k] = compile({open: k}))
            );
          }
          typeof mode.lineComment == "array" ? mode.lineComment.forEach(lC) : lC(mode.lineComment);
        }
      if (mode.blockCommentStart) {    
        var k = `${mode.blockCommentStart}\0${mode.blockCommentEnd}`
        mode.nestMasks.push(
          this.NestMasksCaches.blockComments[k] 
          || (this.NestMasksCaches.blockComments[k] = compile({open: mode.blockCommentStart, close: mode.blockCommentEnd}))
        );
      }
    }
  }

  NestingMode = class {

    TopParser = class extends CodeMirror.nestingMode.parserBase.constructor {
      constructor (main) {
        super();
        this.mainMode = main.mode;
        this.subModeConfigs = main.subModeConfigs;
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
        state.next = undefined;
        
        state.subConf = startMatch.conf.startConfig(state.main.cm, startMatch);
        // *@conf* [ start: (<regexMatch>) -> <object> ]
        startMatch.conf = state.subConf;

        if (state.subConf.mask) {
          // start mask
            // *@conf* [ mask: true ]
          state.subConf.mode = this.mainMode;
          state.subConf.parser = this;
          state.subState = state.mainState;
            // fake activation of a sub mode
          state.originalString = stream.string;
          state.parser = CodeMirror.nestingMode.maskParser.entry;
            // maskParser relations
        } else {
          // start sub mode
          var indent = state.subConf.indent(
            this.mainMode.indent?.(state.mainState, "", ""),
            startMatch,
            state,
          );
          indent = indent || indent == 0 ? indent : 0;
            // possible indentation from main mode
          state.subState = CodeMirror.startState(state.subConf.mode, indent, state);
          state.parser = state.subConf.parser.entry;
          state.subStack._ext(state, startMatch);
        }
        
        startMatch.originalIndex = startMatch.index;
        startMatch.index = 0;
          // fake update to the current cursor position;
          // processed in parser.entry;
          // generalization not possible, MaskParser also processes distant matches
        return state.parser(
          stream, state, startMatch,
          stream.pos,  // searchCursor for MaskParser.entry
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
       * reset the parser state to top
       */
      finally = (state) => {
        state.subConf = state.subState = null;
        state.parser = this.entry;
      }
    };

    constructor (mainMode, subModeConfigs) {
      this.mode = mainMode;
      CodeMirror.nestingMode.compileNestMasksAtMode(mainMode);
      this.subModeConfigs = CodeMirror.nestingMode.Conf.makeStruct(
        mainMode.nestMasks ? subModeConfigs.concat(mainMode.nestMasks.map(l => {l.mask = true; return l;})) : subModeConfigs,
        0,
      );
      this.topParser = new this.TopParser(this);
    }

    Nesting = CodeMirror.nestingMode;
      // flag

    SubStack = class extends Array {
      constructor (...items) {
        super(...items);
        return new Proxy(this, {
          get (target, attr) {
            if (typeof attr == "number" && attr < 0) attr = target.length + attr;
            return target[attr]
          }
        })
      }
      get (i) {return this[i < 0 ? i + this.length : i];}
      _ext (state, startMatch) {
        this.push(
          {
            conf: state.subConf,
            state: CodeMirror.copyState(state.subConf.mode, state.subState),
            startMatch: startMatch,
          }
        );
      }
      _end (state) {
        this.get(-1).endMatch = state.endMatch;
      }
    }
    
    startState (indent, nestState) {
      this.nestState = nestState;
      return {
        mainState: CodeMirror.startState(this.mode, indent, nestState),
        subConf: null,
        subState: null,
        parser: this.topParser.entry,
        suffixes: null,
        masks: [],
        main: this,
        tokenGetter: CodeMirror.nestingMode.TokenGetters.default,
        nestState: nestState,
        nestLv: nestState ? nestState.nestLv + 1 : 0,
        subStack: new this.SubStack(),
        /* 
        next: {startMatch, run: (stream, state) -> token},
        endMatch: endMatch,
        electricDelimiters: {...},
        */
      };
    }

    copyState (state) {
      return {
        mainState: CodeMirror.copyState(this.mode, state.mainState),
        subConf: state.subConf,
        subState: state.subConf && CodeMirror.copyState(state.subConf.mode, state.subState),
        parser: state.parser,
        suffixes: state.suffixes,
        masks: state.masks.map(l => {return {...l}}),
        originalString: state.originalString,
        main: this,
        tokenGetter: state.tokenGetter,
        nestState: state.nestState && {...state.nestState},
        nestLv: state.nestLv,
        subStack: new this.SubStack(...state.subStack),
      };
    }

    _cm;
    get cm () {return this._cm || this.nestState.main.cm;}
    set cm (cm) {this._cm = cm;}

    token (stream, state) {
      state.main.cm = stream.lineOracle.doc.cm;
      state.electricDelimiters = this.electricInput = undefined;
      return state.parser(stream, state);
    }

    indent (state, textAfter, line) {
      if (this.electricInput) {
        var electric = this.electricInput;
        this.electricInput = undefined;
        return electric.indent(state, textAfter, line);
      }
      var mode, modeState;
      if (state.subConf) {
        mode = state.subConf.mode, modeState = state.subState;
      } else {
        mode = this.mode, modeState = state.mainState;
      }
      if (mode.indent) {
        return mode.indent(modeState, textAfter, line);
      } else {
        return CodeMirror.Pass;
      }
    }

    innerMode (state, electric) {
      if (this.electricInput) return;
      var d;
      if (state.electricDelimiters) electric = {mode: this, state: state};
      if (state.subConf) {
        if (state.subConf.mode.innerMode) {
          return state.subConf.mode.innerMode(state.subState, electric);
        } else {
          d = {mode: state.subConf.mode, state: state.subState};
        }
      } else {
        d = {mode: this.mode, state: state.mainState};
      }
      if (electric) {
        electric.mode.electricInput = electric.state.electricDelimiters;
        d = electric;
      }
      return d;
    }

    BlankLineStream (cm) {
      var stream = new CodeMirror.StringStream("\n");
      stream.sol = () => true;
      stream.lineOracle = {doc: {cm: cm}}
      return stream;
    }

    blankLine (state) {
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
        this.mode.blankLine?.(state.mainState);
        state.tokenGetter = this.Nesting.TokenGetters.blankLine;
      }
      state.parser(
        this.BlankLineStream(state.main.cm),
        state,
      );
      state.tokenGetter = this.Nesting.TokenGetters.default;
    }
  };

  constructor () {
    const nestingMode = (mainMode, ...subModeConfigs) => {
      /* EXPORTS > */
      return new this.NestingMode(mainMode, subModeConfigs);
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
