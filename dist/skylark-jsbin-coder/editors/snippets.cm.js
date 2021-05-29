/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-jquery","../jsbin","../coder","./codemirror"],function(e,n,t,s){"use strict";var i={cl:"console.log('$0');",fn:"function $0() {\n\t\n}"};return s.snippets=function(e){var t=e.getCursor(),r=e.getTokenAt(t),c=-1,l="",o=r.string,h=n.settings.snippets||i;r.end>t.ch&&(o=o.slice(0,o.length-r.end+t.ch));var g=o.toLowerCase();return h[g]?(c=h[g].indexOf("$0"),l=h[g].replace(/\$0/,""),e.replaceRange(l,{line:t.line,ch:t.ch-g.length},{line:t.line,ch:t.ch+g.length}),void(-1!==c&&e.setCursor({line:t.line,ch:t.ch-g.length+c}))):s.Pass},t.editors.snippets=s.snippets});
//# sourceMappingURL=../sourcemaps/editors/snippets.cm.js.map
