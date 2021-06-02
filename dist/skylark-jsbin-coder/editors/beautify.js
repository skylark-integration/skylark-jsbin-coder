/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-jquery","../jsbin","../coder","./panels"],function(t,e,s,i){"use strict";var o=e.settings||{},n=o.keys||{};if(!e.embed&&!n.disabled){var d="mac"===t.browser.platform?"metaKey":"ctrlKey";return t(document).on("keydown",function(t){t[d]&&t.shiftKey&&76==t.which&&c()}),s.editors.beautify=c}function c(){var t=i.focused,s={html:e.static+"/js/vendor/beautify/beautify-html.js",css:e.static+"/js/vendor/beautify/beautify-css.js",js:e.static+"/js/vendor/beautify/beautify.js"};"html"===e.state.processors[t.id]?window.html_beautify?f():a(s.html,f):"css"===e.state.processors[t.id]?window.css_beautify?r():a(s.css,r):"javascript"===e.state.processors[t.id]&&(window.js_beautify?u():a(s.js,u))}function a(e,s){t.getScript(e).done(s)}function f(){y(i.focused,window.html_beautify)}function r(){y(i.focused,window.css_beautify)}function u(){y(i.focused,window.js_beautify)}function y(t,e){t.editor.setCode(e(t.editor.getCode(),{indent_size:o.editor&&o.editor.indentUnit||2}))}});
//# sourceMappingURL=../sourcemaps/editors/beautify.js.map
