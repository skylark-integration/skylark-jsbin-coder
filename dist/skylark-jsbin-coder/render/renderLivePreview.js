/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-langx","skylark-jquery","./jsbin","../coder","./getRenderedCode"],function(e,s,n,t,d){return t.render.renderLivePreview=function(e){window.postMessage&&(e&&(saveChecksum&&s.ajax({url:n.getURL()+"/reload",data:{code:n.state.code,revision:n.state.revision,checksum:saveChecksum},type:"post"}),n.state.hasBody=!1),d().then(function(s){n.settings.includejs;var t=n.panels.getVisible(),d=t.indexOf(n.panels.named.live)>-1,i=t.indexOf(n.panels.named.console)>-1;(d||i)&&(n.settings.includejs&&store.sessionStorage.setItem("runnerPending",1),renderer.postMessage("render",{codes:s,options:{injectCSS:n.state.hasBody&&"css"===n.panels.focused.id,requested:e,debug:n.settings.debug,includeJsInRealtime:n.settings.includejs}}),n.state.hasBody=!0)}))}});
//# sourceMappingURL=../sourcemaps/render/renderLivePreview.js.map
