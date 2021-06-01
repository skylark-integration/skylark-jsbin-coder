/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-jsbin-console","skylark-jsbin-renderer","./coder","./editors/panels","./editors/snapshot","./render/upgradeConsolePanel"],function(e,n,i,t,r,o){return i.init=function(){(function(){"use strict";try{if("localStorage"in window&&null!==window.localStorage)return!0}catch(e){return!1}})()&&window.addEventListener&&r.watchForSnapshots();var i=null;$document.bind("codeChange.live",function e(n,r){clearTimeout(i);var o,s,d=t.named.live;t.ready&&(!1===jsbin.settings.includejs&&"javascript"===r.panelId||d.visible&&(!jsbin.lameEditor&&t.focused&&"javascript"===t.focused.id?(s=(o=t.focused.editor).getLine(o.getCursor().line),!0===ignoreDuringLive.test(s)?i=setTimeout(function(){e(n,r)},1e3):renderLivePreview()):renderLivePreview()))}),e.init(document.getElementById("output")),o(t.named.console);var s=$("#live");$("#showlive")[0],n.init(s)}});
//# sourceMappingURL=sourcemaps/init.js.map
