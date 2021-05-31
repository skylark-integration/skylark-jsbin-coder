/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-langx","skylark-jquery","skylark-jsbin-base/storage","./jsbin","../coder","./getRenderedCode"],function(e,s,n,t,a,d){return a.render.renderLivePreview=function(e){window.postMessage&&(e&&(saveChecksum&&s.ajax({url:t.getURL()+"/reload",data:{code:t.state.code,revision:t.state.revision,checksum:saveChecksum},type:"post"}),t.state.hasBody=!1),d().then(function(s){t.settings.includejs;var a=t.panels.getVisible(),d=a.indexOf(t.panels.named.live)>-1,i=a.indexOf(t.panels.named.console)>-1;(d||i)&&(t.settings.includejs&&n.sessionStorage.setItem("runnerPending",1),renderer.postMessage("render",{codes:s,options:{injectCSS:t.state.hasBody&&"css"===t.panels.focused.id,requested:e,debug:t.settings.debug,includeJsInRealtime:t.settings.includejs}}),t.state.hasBody=!0)}))}});
//# sourceMappingURL=../sourcemaps/render/renderLivePreview.js.map
