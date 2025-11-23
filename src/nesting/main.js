// Distributed under an MIT license: https://codemirror.net/5/LICENSE

/**
 * CodeMirror - Nesting Mode Extension
 * -----------------------------------------------------------------------------
 * An extension for CodeMirror 5 that enables
 * the nesting of modes for complex requirements.
 *
 * This module sets `CodeMirror.Nester(mainMode, ...subModeConfigs)`
 * as a mode constructor.
 *
 * Key Features:
 *
 *  - MULTI-LEVEL NESTING
 *    Nester recognizes active Nests in subordinate area
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
 *    //todo
 *
 *  - "nesterState"
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
 *      [, indentClose]
 *      [, close]
 *      [, masks]
 *      [, suffixes]
 *      [, innerStyle]
 *      [, parseDelimiters (a)]
 *      [, tokenizeDelimiters (b)]
 *      [, delimStyle (b)]
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
 *    - start: (startMatch, cm.options) => SubConf Object
 *      (optional)
 *        Callback for a dynamic update of the configuration at runtime.
 *        Is executed at the start of the defined area with the regex match of
 *        the start delimiter. The returned object updates this configuration.
 *
 *    - indent: (outer, startMatch, nesterState) => indent|undefined|CodeMirror.Pass
 *      (optional)
 *        Callback for an indentation request at sub mode start.
 *        `outer` is the current indentation of the main mode and can be
 *        undefined, CodeMirror.Pass or an integer. `startMatch` is the
 *        match of the start delimiter. `state` is the `Nest` state.
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
 *    - indentClose: false | [ undefined | true | "smart" ] | "force" | { getHow: (Token, docLine, sel) → false | *indent }
 *      *indent: state | number | "smart" | "add" | "subtract" | "prev" | "not"
 *        (/src/input/indent.js)
 *
 *      (optional)
 *        //todo
 *
 *
 *
 * -----------------------------------------------------------------------------
 * Author: Adrian F. Hoefflin [srccircumflex]                          Nov. 2025
 */

import { Top } from "./top.js";
import TopComponents from "./top.js";
import NestComponents from "./nest.js";
import { DelimMap } from "./delimMap.js"
import { NESTER } from "./flag.js";


function Nester (topMode, ...nestConfigs) {return Top.Root(topMode, nestConfigs);}
Nester.version = "1.0";
Nester.NESTER = NESTER;
Object.assign(Nester, TopComponents);
Object.assign(Nester, NestComponents);
Nester.globalDelimMap = DelimMap()


export default function (CodeMirror) {
  CodeMirror.Nester = Nester;
  CodeMirror.prototype.Nester = Nester;
}
