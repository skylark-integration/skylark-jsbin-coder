/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-jquery","../jsbin","../coder","./tern"],function(e,r,t){"use strict";if(!r.embed&&!r.mobile){var o=r.state.processors;r.settings.addons||(r.settings.addons={closebrackets:!0,highlight:!1,vim:!1,emacs:!1,trailingspace:!1,fold:!1,sublime:!1,tern:!1,activeline:!0,matchbrackets:!1});var n="open"in document.createElement("details"),i={},s={};["js","html","coffeescript","css"].forEach(function(e){var t=e+"hint",o=!1;"js"===e&&(o=!0),i[t]=void 0!==r.settings[t]?r.settings[t]:o}),(s=e.extend({},{console:!0,line:!1,under:!1,gutter:!1},r.settings.hintShow)).tooltip=s.gutter;var d=e.extend({},r.settings.addons,i),l={closebrackets:{url:"/js/vendor/codemirror5/addon/edit/closebrackets.js",test:m("autoCloseBrackets"),done:function(e){f(e,"autoCloseBrackets",!0)}},highlight:{url:"/js/vendor/codemirror5/addon/search/match-highlighter.js",test:m("highlightSelectionMatches"),done:function(e){f(e,"highlightSelectionMatches",!0)}},vim:{url:["/js/vendor/codemirror5/keymap/vim.js"],test:m("vimMode"),done:function(e){f(e,"vimMode",!0),f(e,"showCursorWhenSelecting",!0)}},emacs:{url:["/js/vendor/codemirror5/keymap/emacs.js"],test:function(){return CodeMirror.keyMap.emacs},done:function(e){f(e,"keyMap","emacs")}},matchtags:{url:["/js/vendor/codemirror5/addon/fold/xml-fold.js","/js/vendor/codemirror5/addon/edit/matchtags.js"],test:function(){return CodeMirror.scanForClosingTag&&CodeMirror.optionHandlers.matchTags},done:function(e){f(e,"matchTags",{bothTags:!0}),e.addKeyMap({"Ctrl-J":"toMatchingTag"})}},trailingspace:{url:"/js/vendor/codemirror5/addon/edit/trailingspace.js",test:m("showTrailingSpace"),done:function(e){f(e,"showTrailingSpace",!0)}},fold:{url:["/js/vendor/codemirror5/addon/fold/foldgutter.css","/js/vendor/codemirror5/addon/fold/foldcode.js","/js/vendor/codemirror5/addon/fold/foldgutter.js","/js/vendor/codemirror5/addon/fold/brace-fold.js","/js/vendor/codemirror5/addon/fold/xml-fold.js","/js/vendor/codemirror5/addon/fold/comment-fold.js"],test:function(){return CodeMirror.helpers.fold&&CodeMirror.optionHandlers.foldGutter&&CodeMirror.optionHandlers.gutters},done:function(e){c.addClass("code-fold"),e.addKeyMap({"Ctrl-Q":function(e){e.foldCode(e.getCursor())}}),f(e,"foldGutter",!0);var r=e.getOption("gutters").slice();r.push("CodeMirror-foldgutter"),f(e,"gutters",r)}},sublime:{url:["/js/vendor/codemirror5/keymap/sublime.js"],test:function(){return CodeMirror.keyMap.sublime},done:function(r){f(r,"keyMap","sublime");var t="mac"===e.browser.platform?"Cmd":"Ctrl";delete CodeMirror.keyMap.sublime[t+"-L"],delete CodeMirror.keyMap.sublime[t+"-T"],delete CodeMirror.keyMap.sublime[t+"-W"],delete CodeMirror.keyMap.sublime[t+"-J"],delete CodeMirror.keyMap.sublime[t+"-R"],delete CodeMirror.keyMap.sublime[t+"-Enter"],delete CodeMirror.keyMap.sublime[t+"-Up"],delete CodeMirror.keyMap.sublime[t+"-Down"],CodeMirror.keyMap.sublime["Shift-Tab"]="indentAuto",r.removeKeyMap("noEmmet")}},tern:{url:["/js/vendor/codemirror5/addon/hint/show-hint.css","/js/vendor/codemirror5/addon/tern/tern.css","/js/vendor/codemirror5/addon/hint/show-hint.js","/js/prod/addon-tern-"+r.version+".min.js"],test:function(){return void 0!==window.ternBasicDefs&&CodeMirror.showHint&&CodeMirror.TernServer&&CodeMirror.startTern},done:function(){CodeMirror.startTern()}},activeline:{url:["/js/vendor/codemirror5/addon/selection/active-line.js"],test:function(){return void 0!==CodeMirror.defaults.styleActiveLine},done:function(e){f(e,"styleActiveLine",!0)}},matchbrackets:{url:[],test:function(){return void 0!==CodeMirror.defaults.matchBrackets},done:function(e){f(e,"matchBrackets",!0)}},csshint:{url:["/js/vendor/csslint/csslint.min.js","/js/vendor/cm_addons/lint/css-lint.js"],test:function(){return h("css")&&"undefined"!=typeof CSSLint},done:function(e){"css"===e.getOption("mode")&&(void 0!==o.css&&"css"!==o.css||hintingDone(e))}},jshint:{url:[e.browser.msie&&e.browser.version<9?"/js/vendor/jshint/jshint.old.min.js":"/js/vendor/jshint/jshint.min.js"],test:function(){return h("javascript")&&"undefined"!=typeof JSHINT},done:function(e){"javascript"===e.getOption("mode")&&(void 0!==o.javascript&&"javascript"!==o.javascript||hintingDone(e,{eqnull:!0}))}},htmlhint:{url:["/js/vendor/htmlhint/htmlhint.js","/js/vendor/cm_addons/lint/html-lint.js"],test:function(){return h("htmlmixed")&&"undefined"!=typeof HTMLHint},done:function(e){"htmlmixed"===e.getOption("mode")&&(void 0!==o.html&&"html"!==o.html||hintingDone(e))}},coffeescripthint:{url:["/js/vendor/coffeelint/coffeelint.min.js","/js/vendor/cm_addons/lint/coffeescript-lint.js"],test:function(){return h("coffeescript")&&"undefined"!=typeof coffeelint},done:function(e){"coffeescript"===e.getOption("mode")&&"coffeescript"===r.state.processors.javascript&&hintingDone(e)}}},c=e("body");window.hintingDone=function(t,o){var i=t.getOption("mode");"javascript"===i&&(i="js"),"htmlmixed"===i&&(i="html");var d=e.extend({},s);if(d.consoleParent=t.getWrapperElement().parentNode.parentNode,f(t,"lintOpt",d),d.gutter){var l=t.getOption("gutters");if(-1===l.indexOf("CodeMirror-lint-markers")){var c=l.slice();c.push("CodeMirror-lint-markers"),f(t,"gutters",c)}var a=t.getOption("lineNumbers");f(t,"lineNumbers",!a),f(t,"lineNumbers",a)}f(t,"lint",{delay:800,options:e.extend({},o,r.settings[i+"hintOptions"])}),d.console&&t.consolelint&&($document.trigger("sizeeditors"),e(t.consolelint.head).on("click",function(){n||e(this).nextAll().toggle(),setTimeout(function(){$document.trigger("sizeeditors")},10)}))};var a=Object.keys(d);a.forEach(p),window.reloadAddons=function(e){e?e.forEach(p):a.forEach(p)}}function u(t){if(0!==t.indexOf("http")&&(t=r.static+t),".js"===t.slice(-3))return e.ajax({url:t+"?"+r.version,dataType:"script",cache:!0});if(".css"===t.slice(-4)){var o=e.Deferred();return setTimeout(function(){c.append('<link rel="stylesheet" href="'+t+"?"+r.version+'">'),o.resolve()},0),o}}function f(e,r,t){e.setOption(r,t)}function m(e){return function(){return void 0!==CodeMirror.optionHandlers[e]}}function h(e){return void 0!==CodeMirror.defaults.lint&&CodeMirror.helpers.lint&&CodeMirror.helpers.lint[e]&&CodeMirror.optionHandlers.lint}function p(t){var o=l[t];o&&d[t]&&("string"==typeof o.url&&(o.url=[o.url]),e.when.call(e,o.url.map(u)).done(function(){o.done&&function(r){var t=e.Deferred(),o=null;if(r())t.resolve();else{var n=(new Date).getTime(),i=new Date;o=setInterval(function(){i=new Date,r()?(clearInterval(o),t.resolve()):i.getTime()-n>1e4&&(clearInterval(o),t.reject())},100)}return t}(o.test).then(function(){r.panels.allEditors(function(e){e.editor&&o.done(e.editor)})})}))}});
//# sourceMappingURL=../sourcemaps/editors/addons.js.map