/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
define(["skylark-jquery","skylark-jsbin-base/storage","skylark-jsbin-processors","../jsbin","../coder","./codemirror","./snippets.cm","../chrome/splitter"],function(e,t,s,i,o,r){var n=e(document),a=e("#source"),l=!e("html").hasClass("layout"),d={html:"htmlmixed",javascript:"javascript",css:"css",typescript:"javascript",markdown:"markdown",coffeescript:"coffeescript",livescript:"text/x-livescript",jsx:"javascript",less:"text/x-less",sass:"text/x-sass",scss:"text/x-scss",processing:"text/x-csrc",jade:"text/x-jade",clojurescript:"clojure"},c=new RegExp("[​- ]","g");"default"===i.settings.editor.tabMode?r.keyMap.basic.Tab=void 0:"classic"!==i.settings.editor.tabMode&&(r.keyMap.basic.Tab="indentMore"),r.commands||(r.commands={});r.commands.autocomplete=function(e){if(r.snippets(e)===r.Pass)return r.simpleHint(e,r.hint.javascript)},r.commands.snippets=function(e){"use strict";return-1===["htmlmixed","javascript","css",d.less,d.sass,d.scss].indexOf(e.options.mode)?r.simpleHint(e,r.hint.anyword):oldCodeMirror?oldCodeMirror.snippets(e):i.mobile?void 0:r.snippets(e)};var p=function(t,o){"use strict";var l=this,c=null,h={},u=t,g=e('<div class="stretch panelwrapper"></div>');if(l.settings=o=o||{},l.id=l.name=t,(c=e(".panel."+t)).data("name",t),l.$el=c.detach(),l.$el.appendTo(g),g.appendTo(a),l.$panel=l.$el,l.$el=l.$el.parent().hide(),l.el=document.getElementById(t),l.order=++p.order,l.label=o.label||t,l.$el.data("panel",l),this._eventHandlers={},l.on("show",panels.updateQuery),l.on("hide",panels.updateQuery),1===l.order&&(o.nosplitter=!0),o.editor){if(h={parserfile:[],readOnly:!!i.state.embed&&"nocursor",dragDrop:!1,mode:d[u],lineWrapping:!1,theme:i.settings.theme||"jsbin",highlightLine:!0},e.extend(h,i.settings.editor||{}),h.extraKeys={},h.extraKeys.Tab="javascript"===t?"autocomplete":"snippets","html"===t&&e.extend(h,{syntax:t,profile:t}),"string"==typeof h.tabSize&&(h.tabSize=parseInt(h.tabSize,10)||2),"string"==typeof h.indentUnit&&(h.indentUnit=parseInt(h.indentUnit,10)||2),l.editor=r.fromTextArea(l.el,h),l.editor.on("highlightLines",function(){window.location.hash=panels.getHighlightLines()}),l.editor.on("change",function(e,t){return i.saveDisabled?n.trigger("codeChange.live",[{panelId:l.id,revert:!0,origin:t.origin}]):n.trigger("codeChange",[{panelId:l.id,revert:!0,origin:t.origin}]),!0}),l.editor.on("focus",function(){l.focus()}),"javascript"===t){var f="mac"===e.browser.platform?"Cmd":"Ctrl",m={};m[f+"-D"]="deleteLine",m[f+"-/"]=function(e){r.commands.toggleComment(e)},m.name="noEmmet",l.editor.addKeyMap(m)}l._setupEditor(l.editor,t)}e("html").is(".layout")?(l.splitter=e(),l.$el.removeClass("stretch")):o.nosplitter?l.splitter=e():(l.splitter=l.$el.splitter({}).data("splitter"),l.splitter.hide()),i.state.processors&&i.state.processors[t]?(u=i.state.processors[t],s.set(l,i.state.processors[t])):o.processor?(u=o.processors[o.processor],s.set(l,o.processor)):s[l.id]?s.set(l,l.id):l.processor=function(e){return new Promise(function(t){t(e)})},o.beforeRender&&n.bind("render",e.proxy(o.beforeRender,l)),o.editor||(l.ready=!0),i.state.embed,this.controlButton=e('<a role="button" class="button group" href="?'+t+'">'+l.label+"</a>"),this.updateAriaState(),this.controlButton.on("click touchstart",function(){return l.toggle(),!1}),this.controlButton.appendTo("#panels"),c.focus(function(){l.focus()}),i.mobile||c.add(this.$el.find(".label")).click(function(){l.focus()})};function h(e,s){if(e.codeSet)l=!0;else{var o=t.sessionStorage.getItem("jsbin.content."+s),r=i.embed?null:t.localStorage.getItem("saved-"+s),a=t.sessionStorage.getItem("url"),l=!1;if(a===i.getURL()||i.state.checksum||(t.sessionStorage.removeItem("checksum"),i.saveChecksum=!1),template&&o==template[s])e.setCode(o);else if(o&&a==i.getURL()&&a!==i.root)e.setCode(o),l=o!=r&&o!=template[s];else if(template.post||null===r||/(edit|embed)$/.test(window.location)||window.location.search)e.setCode(template[s]);else{e.setCode(r);var d=JSON.parse(t.localStorage.getItem("saved-processors")||"{}")[s];d&&i.processors.set(i.panels.panels[s],d)}e.editor&&e.editor.clearHistory&&e.editor.clearHistory()}l&&n.trigger("codeChange",[{revert:!1,onload:!0}])}return p.order=0,p.prototype={virgin:!0,visible:!1,updateAriaState:function(){this.controlButton.attr("aria-label",this.label+" Panel: "+(this.visible?"Active":"Inactive"))},show:function(t){if(hideOpen(),!this.visible){n.trigger("history:close");var s=this,o=s.$el.find(".panel").length;if(analytics.showPanel(s.id),i.mobile&&panels.hideAll(!0),s.splitter.length){if(0===o||o>1)e(".panel."+s.id).show().closest(".panelwrapper").show();else s.$el.show();s.splitter.show()}else s.$el.show();if($body.addClass("panelsVisible"),s.settings.show&&s.settings.show.call(s,!0),s.controlButton.addClass("active"),s.visible=!0,this.updateAriaState(),i.mobile&&window.matchMedia&&window.matchMedia("(max-height: 410px) and (max-width: 640px)").matches&&s.editor&&s.editor.focus(),i.mobile)return s.focus(),void s.trigger("show");setTimeout(function(){if(l&&(void 0!==t?s.splitter.trigger("init",t):s.distribute()),s.editor){if(s.virgin){var o=s.$el.find(".label").outerHeight();o+=8,i.mobile||e(s.editor.scroller).find(".CodeMirror-lines").css("padding-top",o),h(s,s.name)}s.virgin&&!i.panels.ready||(s.editor.focus(),s.focus()),s.virgin&&s.settings.init&&setTimeout(function(){s.settings.init.call(s)},10)}else s.focus();n.trigger("sizeeditors"),s.trigger("show"),s.virgin=!1},0)}},hide:function(t){this.visible=!1,this.updateAriaState(),t?this.editor&&(getRenderedCode[this.id]=getRenderedCode.render(this.id)):analytics.hidePanel(this.id);var s=this.$el.find(".panel").length;if(0===s||s>1){var o=e(".panel."+this.id).hide();o.prev().hide(),0===o.closest(".panelwrapper").find(".panel:visible").length&&o.closest(".panelwrapper").hide()}else this.$el.hide(),this.splitter.hide();this.editor&&this.controlButton.toggleClass("hasContent",!!this.getCode().trim().length),this.controlButton.removeClass("active"),this.settings.hide&&this.settings.hide.call(this,!0);var r=i.panels.getVisible();r.length&&(i.panels.focused=r[0],i.panels.focused.editor?i.panels.focused.editor.focus():i.panels.focused.$el.focus(),i.panels.focused.focus()),!t&&i.mobile&&0===r.length&&(n.trigger("history:load"),e("#history").show(),setTimeout(function(){$body.removeClass("panelsVisible")},100)),this.trigger("hide"),t||(this.distribute(),n.trigger("sizeeditors"),n.trigger("history:open"))},toggle:function(){this[this.visible?"hide":"show"]()},getCode:function(){if(this.editor)return c.lastIndex=0,this.editor.getCode().replace(c,"")},setCode:function(e){this.editor&&(void 0===e&&(e=""),this.controlButton.toggleClass("hasContent",!!e.trim().length),this.codeSet=!0,this.editor.setCode(e.replace(c,"")))},codeSet:!1,blur:function(){this.$panel.addClass("blur")},focus:function(){this.$panel.removeClass("blur"),i.panels.focus(this)},render:function(){"use strict";var e=[].slice.call(arguments),t=this;return new Promise(function(s,o){t.editor?t.processor(t.getCode()).then(s,o):t.visible&&t.settings.render&&(i.panels.ready&&t.settings.render.apply(t,e),s())})},init:function(){this.settings.init&&this.settings.init.call(this)},_setupEditor:function(){var s=t.sessionStorage.getItem("panel")||i.settings.focusedPanel,o=this,r=o.editor;r.setCode=function(e){try{r.setValue(e)}catch(e){}},r.getCode=function(){return r.getValue()},r.currentLine=function(){return r.getCursor().line},i.embed&&(r._focus=r.focus,r.focus=function(){}),r.id=o.name,r.win=r.getWrapperElement(),r.scroller=e(r.getScrollerElement());var l=o.$el.find(".label");-1===document.body.className.indexOf("ie6")&&l.length&&r.on("scroll",function(t){r.getScrollInfo().top>10?l.stop().animate({opacity:0},20,function(){e(this).hide()}):l.show().stop().animate({opacity:1},150)});n.bind("sizeeditors",function(){if(o.visible){var e=o.editor.scroller.closest(".panel").outerHeight(),t=0;t+=o.$el.find("details").filter(":visible").height()||0,i.lameEditor||r.scroller.height(e-t);try{r.refresh()}catch(e){}setTimeout(function(){a[0].style.paddingLeft="1px",setTimeout(function(){a[0].style.paddingLeft="0"},0)},0)}}),setTimeout(function(){o.ready=!0,h(o,o.name),s==o.name&&setTimeout(function(){if(o.focus(),o.visible&&!i.mobile&&!i.tablet){r.focus();for(var e=r.getCode().split("\n"),s=null,n=0;n<e.length;n++)if(null===s&&""===e[n].trim()){s=n;break}r.setCursor({line:1*(t.sessionStorage.getItem("line")||s||0),ch:1*(t.sessionStorage.getItem("character")||0)})}},110)},0)},populateEditor:function(){h(this,this.name)},on:function(e,t){return(this._eventHandlers[e]=this._eventHandlers[e]||[]).push(t),this},trigger:function(e){var t=[].slice.call(arguments,1);t.unshift({type:e});for(var s=this._eventHandlers[e],i=0;s&&s[i];)s[i++].apply(this,t);return this}},s.set=function(t,o,r){var n=t.id;i.state.processors||(i.state.processors={});var a=o&&d[o]||d[n],l="jsx"!==o;if(t){t.trigger("processor",o||"none"),o&&s[o]?(i.state.processors[n]=o,t.processor=s[o](function(){t.editor.setOption("mode",a),t.editor.setOption("smartIndent",l),e("div.processorSelector").find("a").trigger("select",[o]),r&&r()})):(t.editor.setOption("mode",a),t.editor.setOption("smartIndent",l),t.processor=defaultProcessor,i.state.processors[n]=n,delete t.type);var c=a;"javascript"===a&&(c="js"),"htmlmixed"===a&&(c="html"),t.editor.getOption("lint")&&t.editor.lintStop(),i.settings[c+"hint"]&&(t.editor.setOption("mode",a),"undefined"!=typeof hintingDone&&(t.editor.setOption("mode",a),hintingDone(t.editor)))}},o.editors.Panel=p});
//# sourceMappingURL=../sourcemaps/editors/panel.js.map
