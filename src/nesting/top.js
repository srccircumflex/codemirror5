import { copyState, startState } from "../modes.js"
import { Pass } from "../util/misc.js";
import { Nest } from "./nest.js";
import { TopParser } from "./parser.js";
import { NestStateStarters, TokenGetters, serializeToken } from "./utils.js";
import { NESTER } from "./flag.js"


export class NestStack extends Array {
  get (i) {return this[i < 0 ? i + this.length : i];}
  _ext (state, startMatch) {
    delete startMatch.conf;
    this.push(
      {
        nest: state.nest.Copy(),
        startMatch: startMatch,
      }
    );
  }
  _end (state) {
    if (state.end) /* todo (debug) */ delete state.end.state;
    this.get(-1).endMatch = state.end;
  }
};


export class Top {
  NESTER = NESTER;
  parser = TopParser;
  mode;
  state;
  nests;

  // duck typing for Mask Parser
  tokenInner (token) {return token;}

  static Root (mode, nests) {
    var top = new Top();
    top.mode = mode;
    Nest.compileNestMasksAtMode(mode, 0);
    top.nests = Nest.Nodes(
      mode.nestMasks
      ? nests.concat(mode.nestMasks)
      : nests,
      0,
    );
    return top;
  }

  Copy () {
    var copy = new Top();
    Object.assign(copy, this);
    copy.state = copyState(this.mode, this.state);
    return copy;
  }

  startState (indent, nesterState) {
    if (nesterState) {
      this.state = nesterState.startNestState(this.mode, indent, nesterState);
    } else {
      this.state = startState(this.mode, indent, nesterState);
    }
    return {
      NESTER: NESTER,
      top: this,
      nest: null,
      parser: TopParser.atSOL,
      masks: [],
      target: "nest",
      tokenGetter: TokenGetters.tokenGetter,
      delimTokenGetter: TokenGetters.delimTokenGetter,
      nesterState: nesterState,
      nestLv: nesterState ? nesterState.nestLv + 1 : 0,
      nestStack: new NestStack(),
        // inner state fields are SHORT TERM (no copy set)
      startNestState: NestStateStarters.default,

      // SHORT TERM FIELDS (no copy set)
        nestBefore: undefined,
          //  util to recv. nest on close delim
        suffixes: undefined,   // [nestConf, ...]
        next: undefined,       // {startMatch, run: (stream, state) -> token} | maskMatch
        end: undefined,        // endMatch
    };
  }

  copyState (state) {
    const copy = {
      NESTER: NESTER,
      top: state.top/*this*/.Copy(),
      nest: state.nest ? state.nest.Copy() : null,
      parser: state.parser,
      masks: state.masks.map(m => {return {...m}}),
      target: state.target,
      tokenGetter: state.tokenGetter,
      delimTokenGetter: state.delimTokenGetter,
      nesterState: state.nesterState && {...state.nesterState},
      nestLv: state.nestLv,
      nestStack: new NestStack(...state.nestStack),
      startNestState: NestStateStarters.default,
      // SHORT TERM FIELDS (no copy set)
        nestBefore: state.nestBefore,
        suffixes: state.suffixes,
        next: state.next,
        end: state.end,
    };
    return copy;
  }

  token (stream, state) {return serializeToken(state.parser(stream, state));}

  indent (state, textAfter, line) {
    let mode, modeState;
    if (state.nest) {
      mode = state.nest.mode, modeState = state.nest.state;
    } else {
      /*this*/
      mode = state.top.mode, modeState = state.top.state;
    }
    if (mode.indent) {
      return mode.indent(modeState, textAfter, line);
    } else {
      return Pass;
    }
  }

  innerMode (state) {
    if (state.nest) return {mode: state.nest.mode, state: state.nest.state};
    else return {mode: state.top.mode, state: state.top.state};
  }

  blankLine (state, blankLineStream) {
    // executes only one action for a blank line:
    //  - closes a sub mode whose `close` is not defined (close at SOL by default),
    //  - closes a sub mode whose `close` matches "\n",
    //  - or starts a sub mode whose open matches "\n".
    const tokenGetters_default = [state.tokenGetter, state.delimTokenGetter];
    if (state.nest) {
      if (!(state.nest.mode instanceof Top)) {
        state.tokenGetter = state.delimTokenGetter = TokenGetters.skip;
      }
      state.nest.mode.blankLine?.(state.nest.state, blankLineStream);
    } else {
      this.mode.blankLine?.(state.top.state, blankLineStream);
      state.tokenGetter = state.delimTokenGetter = TokenGetters.skip;
    }
    state.parser(
      blankLineStream,
      state,
    );
    [state.tokenGetter, state.delimTokenGetter] = tokenGetters_default;
  }
}


export default {
  Top: Top,
};
