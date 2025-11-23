
class _DelimMap {
  
  constructor () {
    this.index = {};
  }
  
  fetch (delim) {
    let result = [], e;
    for (e of Object.values(this.index)) {
      if (e.key.test(delim)) result.push(e.func);
    }
    return result;
  }

  static set (target, key, value) {
    target.index[key] = {key: new RegExp(key), func: value};
    return true;
  }

}

export function DelimMap () {
  return new Proxy(
    new _DelimMap(),
    _DelimMap,
  )
}



