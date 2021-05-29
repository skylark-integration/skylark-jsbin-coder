/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-jquery","../jsbin","../coder"],function(e,t,s){"use strict";var i=t.settings||{},n=i.keys||{};if(!t.embed&&!n.disabled){var o="mac"===e.browser.platform?"metaKey":"ctrlKey";return e(document).on("keydown",function(e){e[o]&&e.shiftKey&&76==e.which&&a()}),s.editors.beautify=a}function a(){var e=t.panels.focused,s={html:t.static+"/js/vendor/beautify/beautify-html.js",css:t.static+"/js/vendor/beautify/beautify-css.js",js:t.static+"/js/vendor/beautify/beautify.js"};"html"===t.state.processors[e.id]?window.html_beautify?c():d(s.html,c):"css"===t.state.processors[e.id]?window.css_beautify?f():d(s.css,f):"javascript"===t.state.processors[e.id]&&(window.js_beautify?r():d(s.js,r))}function d(t,s){e.getScript(t).done(s)}function c(){u(t.panels.focused,window.html_beautify)}function f(){u(t.panels.focused,window.css_beautify)}function r(){u(t.panels.focused,window.js_beautify)}function u(e,t){e.editor.setCode(t(e.editor.getCode(),{indent_size:i.editor&&i.editor.indentUnit||2}))}});
//# sourceMappingURL=../sourcemaps/editors/beautify.js.map
