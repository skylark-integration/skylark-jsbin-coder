/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-jquery","../jsbin","../coder"],function(e,t,r){"charAt charCodeAt indexOf lastIndexOf substring substr slice trim trimLeft trimRight toUpperCase toLowerCase split concat match replace search".split(" "),"length concat join splice push pop shift unshift slice reverse sort indexOf lastIndexOf every some filter forEach map reduce reduceRight ".split(" "),"prototype apply call bind".split(" "),"break case catch continue debugger default delete do else false finally for function if in instanceof new null return switch throw true try typeof var void while with".split(" ");return r.editors.autocomplete={startTagComplete:function(e){if(!e.somethingSelected()){var t,r=e.getCursor(!1),s=e.getTokenAt(r),i=s;for(/^[\w$_]*$/.test(s.string)||(s=i={start:r.ch,end:r.ch,string:"",state:s.state,className:"."==s.string?"js-property":null});"js-property"==i.className;){if("."!=(i=e.getTokenAt({line:r.line,ch:i.start})).string)return;if(i=e.getTokenAt({line:r.line,ch:i.start}),!n)var n=[];n.push(i)}return t="<></>",e.replaceRange(t,{line:r.line,ch:s.start},{line:r.line,ch:s.end}),e.focus(),e.setCursor({line:r.line,ch:s.end}),!0}}}});
//# sourceMappingURL=../sourcemaps/editors/autocomplete.js.map
