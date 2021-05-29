/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-jsbin-render/console","skylark-jquery","../jsbin","../coder","../editors/panels"],function(e,n,o,i,s){return i.render.upgradeConsolePanel=function(i){i.setCursorTo=e.setCursorTo,i.$el.click(function(o){n(o.target).closest("#output").length||e.focus()}),i.reset=function(){e.reset()},i.settings.render=function(e){renderLivePreview(e||!1)},i.settings.show=function(){e.clear(),setTimeout(function(){s.named.console.ready&&!o.embed&&e.focus()},0)},i.settings.hide=function(){s.named.live.visible},$document.one("jsbinReady",function(){var e=function(){n("#runconsole")[this.visible?"hide":"show"]()};s.named.live.on("show",e).on("hide",e),s.named.live.visible&&n("#runconsole").hide()})}});
//# sourceMappingURL=../sourcemaps/render/upgradeConsolePanel.js.map
