import { CodeMirror } from "./edit/main.js"
export default CodeMirror

CodeMirror.async = function DevCodeMirrorAsync () {
  return new Promise((resolve, reject) => {
    var i = 0
    function query () {
      if (window.CodeMirror && window.CodeMirror.asyncLoaded) {
        CodeMirror.async = {then: (func) => func(window.CodeMirror), reject: () => null}
        return resolve(window.CodeMirror)
      } else {
        i += 1
        if (i >= 40) {
          console.info("[async CodeMirror (dev)] reject: not loaded after 2 seconds")
          return reject()
        } else {
          setTimeout(query, 50)
        }
      }
    }
    query()
  })
}()

import addNester from "./nesting/main.js"
addNester(CodeMirror)
