/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-jquery","../jsbin","../updateTitle"],function(t,e,s){return coder.editors.snapshot={watchForSnapshots:function(){"use strict";t(document).on("saved",function(){localStorage.latest=e.state.code+"/"+e.state.revision}),window.addEventListener("storage",function(t){"latest"===t.key&&localStorage.latest.split("/")[0]===e.state.code&&(e.state.latest=!1,saveChecksum=!1,e.state.checksum=!1,s(),window.history.replaceState(null,null,e.getURL()+"/edit"))})}}});
//# sourceMappingURL=../sourcemaps/editors/snapshot.js.map
