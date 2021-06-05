/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-jsbin-console","skylark-jsbin-renderer","./jsbin","./coder","./editors/panels","./editors/snapshot","./render/upgradeConsolePanel"],function(e,n,i,t,r,o,s){return t.init=function(){(function(){"use strict";try{if("localStorage"in window&&null!==window.localStorage)return!0}catch(e){return!1}})()&&window.addEventListener&&o.watchForSnapshots();var t=null;i.$document.bind("codeChange.live",function e(n,o){clearTimeout(t);var s,d,a=r.named.live;r.ready&&(!1===i.settings.includejs&&"javascript"===o.panelId||a.visible&&(!i.lameEditor&&r.focused&&"javascript"===r.focused.id?(d=(s=r.focused.editor).getLine(s.getCursor().line),!0===ignoreDuringLive.test(d)?t=setTimeout(function(){e(n,o)},1e3):r.renderLivePreview()):r.renderLivePreview()))}),e.init(document.getElementById("output")),s(r.named.console);var d=$("#live");$("#showlive")[0],n.init(d)}});
//# sourceMappingURL=sourcemaps/init.js.map
