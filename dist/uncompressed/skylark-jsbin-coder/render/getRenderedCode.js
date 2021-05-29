define([
  "skylark-jquery",
  "../jsbin",
   "../coder",
  "../editors/panles"
],function ($, jsbin, code,panles) {
  /*globals $, jsbin, editors,  loopProtect, documentTitle, CodeMirror, hintingDone*/

  // moved from render/render.js

  // quasi polyfill
  //if (typeof window.Promise === 'undefined') {
  //  window.Promise = RSVP.Promise;
  //}

  var renderCodeWorking = false;
  function formatErrors(res) {
    var errors = [];
    var line = 0;
    var ch = 0;
    for (var i = 0; i < res.length; i++) {
      line = res[i].line || 0;
      ch = res[i].ch || 0;
      errors.push({
        from: CodeMirror.Pos(line, ch),
        to: CodeMirror.Pos(line, ch),
        message: res[i].msg,
        severity: 'error',
      });
    }
    return errors;
  };

  var getRenderedCode = function () {
    'use strict';

    if (renderCodeWorking) {
      // cancel existing jobs, and replace with this job
    }

    renderCodeWorking = true;

    // this allows us to make use of a promise's result instead of recompiling
    // the language each time
    var promises = ['html', 'javascript', 'css'].reduce(function (prev, curr) {
      if (!jsbin.owner() || panels.focused && curr === panels.focused.id) {
        getRenderedCode[curr] = getRenderedCode.render(curr);
      }
      prev.push(getRenderedCode[curr]);
      return prev;
    }, []);

    return Promise.all(promises).then(function (data) {
      var res = {
        html: data[0],
        javascript: data[1],
        css: data[2],
      };
      return res;
    }).catch(function (e) {
      // swallow
    });
  };

  getRenderedCode.render = function render (language) {
    return new Promise(function (resolve, reject) {
      panels.named[language].render().then(resolve, function (error) {
        console.warn(panels.named[language].processor.id + ' processor compilation failed');
        if (!error) {
          error = {};
        }

        if ($.isArray(error)) { // then this is for our hinter
          // console.log(data.errors);
          var cm = panels.named[language].editor;

          // if we have the error reporting function (called updateLinting)
          if (typeof cm.updateLinting !== 'undefined') {
            hintingDone(cm);
            var err = formatErrors(error);
            cm.updateLinting(err);
          } else {
            // otherwise dump to the console
            console.warn(error);
          }
        } else if (error.message) {
          console.warn(error.message, error.stack);
        } else {
          console.warn(error);
        }

        reject(error);
      });
    });
  };



  return coder.render.getRenderedCode = getRenderedCode;

});