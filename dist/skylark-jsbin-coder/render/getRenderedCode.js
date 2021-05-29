/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-jquery","../jsbin","../coder","../editors/panles"],function(e,n,r,o){var s=function(){"use strict";!0;var e=["html","javascript","css"].reduce(function(e,r){return(!n.owner()||panels.focused&&r===panels.focused.id)&&(s[r]=s.render(r)),e.push(s[r]),e},[]);return Promise.all(e).then(function(e){return{html:e[0],javascript:e[1],css:e[2]}}).catch(function(e){})};return s.render=function(n){return new Promise(function(r,o){panels.named[n].render().then(r,function(r){if(console.warn(panels.named[n].processor.id+" processor compilation failed"),r||(r={}),e.isArray(r)){var s=panels.named[n].editor;if(void 0!==s.updateLinting){hintingDone(s);var i=function(e){for(var n=[],r=0,o=0,s=0;s<e.length;s++)r=e[s].line||0,o=e[s].ch||0,n.push({from:CodeMirror.Pos(r,o),to:CodeMirror.Pos(r,o),message:e[s].msg,severity:"error"});return n}(r);s.updateLinting(i)}else console.warn(r)}else r.message?console.warn(r.message,r.stack):console.warn(r);o(r)})})},coder.render.getRenderedCode=s});
//# sourceMappingURL=../sourcemaps/render/getRenderedCode.js.map
