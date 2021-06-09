/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-jquery","./jsbin"],function(t,e){function i(l){"use strict";void 0===l&&(l=e.panels.named.html.getCode());var n=l.match(i.re);null!==n&&n[1]!==documentTitle&&(i.lastState=e.state.latest,documentTitle=t("<div>").html(n[1].trim()).text(),documentTitle?document.title=documentTitle+" - JS Bin":document.title="JS Bin",!e.state.latest&&e.state.revision&&(document.title="(#"+e.state.revision+") "+document.title))}return i.re=/<title>(.*)<\/title>/i,i.lastState=null,e.coder.updateTitle=i});
//# sourceMappingURL=sourcemaps/updateTitle.js.map
