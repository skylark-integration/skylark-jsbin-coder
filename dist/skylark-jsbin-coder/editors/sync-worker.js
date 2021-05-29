/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define([],function(){var e,t=new FileReader;self.addEventListener("message",function(a){var d=1,i=function(){t.readAsText(a.data),setTimeout(i,500*d)};i(),t.onload=function(t){var i=+new Date(a.data.lastModifiedDate);e!==i?(d=1,e=i,postMessage({body:t.target.result,size:t.total,lastModified:t.timeStamp})):delete t,d<8&&(d+=1)}},!1)});
//# sourceMappingURL=../sourcemaps/editors/sync-worker.js.map
