/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-langx","skylark-jquery","skylark-jsbin-chrome/analytics","../jsbin"],function(n,t,r,o){return n.mixin(r,{universalEditor:function(n){r.track("menu","universalEditor",n)},library:function(n,t){r.track("menu",n,"library",t)},showPanel:function(n){r.track("panel","show",n)},hidePanel:function(n){r.track("panel","hide",n)},enableLiveJS:function(n){r.track("button","auto-run js",n?"on":"off")},layout:function(n){var t=[],o="";for(o in n)t.push(o.id);r.track("layout","update",t.sort().join(",")||"none")},run:function(n){r.track(n||"button","run with js")},runconsole:function(n){r.track(n||"button","run console")}}),r});
//# sourceMappingURL=../sourcemaps/chrome/analytics.js.map
