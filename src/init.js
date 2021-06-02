define([
	"skylark-jsbin-console",
	"skylark-jsbin-renderer",
	"./coder",
	"./editors/panels",
	"./editors/snapshot",
	"./render/upgradeConsolePanel"
],function(jsconsole,renderer,coder,panels,snapshot,upgradeConsolePanel) {

	function init() {
		//snapshot
		function testLocalStorage() {
			'use strict';
			try {
				if ('localStorage' in window && window['localStorage'] !== null) { // jshint ignore:line
					return true;
				}
			} catch(e){
				return false;
			}
		}

		if (testLocalStorage() && window.addEventListener) {
			snapshot.watchForSnapshots();
		}


		// from render/live.js
	  function codeChangeLive(event, data) {
	    clearTimeout(deferredLiveRender);

	    var editor,
	        line,
	        panel = panels.named.live;

	    if (panels.ready) {
	      if (jsbin.settings.includejs === false && data.panelId === 'javascript') {
	        // ignore
	      } else if (panel.visible) {
	        // test to see if they're write a while loop
	        if (!jsbin.lameEditor && panels.focused && panels.focused.id === 'javascript') {
	          // check the current line doesn't match a for or a while or a do - which could trip in to an infinite loop
	          editor = panels.focused.editor;
	          line = editor.getLine(editor.getCursor().line);
	          if (ignoreDuringLive.test(line) === true) {
	            // ignore
	            deferredLiveRender = setTimeout(function () {
	              codeChangeLive(event, data);
	            }, 1000);
	          } else {
	            panels.renderLivePreview();
	          }
	        } else {
	          panels.renderLivePreview();
	        }
	      }
	    }
	  }

	  // this needs to be after renderLivePreview is set (as it's defined using
	  // var instead of a first class function).
	  var liveScrollTop = null;

	  // timer value: used in the delayed render (because iframes don't have
	  // innerHeight/Width) in Chrome & WebKit
	  var deferredLiveRender = null;
	  $document.bind('codeChange.live', codeChangeLive);


	  // from render/console.js
	  var msgType = '';

  	  jsconsole.init(document.getElementById('output'));

  	  upgradeConsolePanel(panels.named.console);


  	  // from render/live.js

  	  var $live = $('#live'),
      showlive = $('#showlive')[0];

      renderer.init($live);

	}

	return coder.init = init;
	
});