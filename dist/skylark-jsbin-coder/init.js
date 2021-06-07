/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-jsbin-console","skylark-jsbin-renderer","./jsbin","./coder","./editors/panels","./editors/snapshot","./render/upgradeConsolePanel"],function(e,n,i,r,t,o,d){return r.init=function(){(function(){"use strict";try{if("localStorage"in window&&null!==window.localStorage)return!0}catch(e){return!1}})()&&window.addEventListener&&o.watchForSnapshots();var r=null;i.$document.bind("codeChange.live",function e(n,o){clearTimeout(r);var d,s,a=t.named.live;t.ready&&(!1===i.settings.includejs&&"javascript"===o.panelId||a.visible&&(!i.lameEditor&&t.focused&&"javascript"===t.focused.id?(s=(d=t.focused.editor).getLine(d.getCursor().line),!0===ignoreDuringLive.test(s)?r=setTimeout(function(){e(n,o)},1e3):t.renderLivePreview()):t.renderLivePreview()))}),e.init(document.getElementById("output")),d(t.named.console);var s=$("#live");$("#showlive")[0],n.init(s).then(function(){t.renderLivePreview()})}});
//# sourceMappingURL=sourcemaps/init.js.map
