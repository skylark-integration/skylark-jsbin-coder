define([
  "skylark-langx",
  "skylark-jquery",
  "skylark-jsbin-base/storage",
   "./jsbin",
   "../coder",
   "./getRenderedCode"
],function (langx,$,store,jsbin,coder,getRenderedCode) {
  // moved from render/live.js
  

  /**
   * =============================================================================
   * =============================================================================
   * =============================================================================
   */

  function sendReload() {
    if (saveChecksum) {
      $.ajax({
        url: jsbin.getURL() + '/reload',
        data: {
          code: jsbin.state.code,
          revision: jsbin.state.revision,
          checksum: saveChecksum
        },
        type: 'post'
      });
    }
  }


  /** ============================================================================
   * Live rendering.
   *
   * Comes in two tasty flavours. Basic mode, which is essentially an IE7
   * fallback. Take a look at https://github.com/jsbin/jsbin/issues/651 for more.
   * It uses the iframe's name and JS Bin's event-stream support to keep the
   * page up-to-date.
   *
   * The second mode uses postMessage to inform the runner of changes to code,
   * config and anything that affects rendering, and also listens for messages
   * coming back to update the JS Bin UI.
   * ========================================================================== */

  /**
   * Render live preview.
   * Create the runner iframe, and if postMe wait until the iframe is loaded to
   * start postMessaging the runner.
   */

  // The big daddy that handles postmessaging the runner.
  var renderLivePreview = function (requested) {
    // No postMessage? Don't render – the event-stream will handle it.
    if (!window.postMessage) { return; }

    // Inform other pages event streaming render to reload
    if (requested) {
      sendReload();
      jsbin.state.hasBody = false;
    }
    getRenderedCode().then(function (codes) { // modified by lwf
      var includeJsInRealtime = jsbin.settings.includejs;

      // Tell the iframe to reload
      var visiblePanels = jsbin.panels.getVisible();
      var outputPanelOpen = visiblePanels.indexOf(jsbin.panels.named.live) > -1;
      var consolePanelOpen = visiblePanels.indexOf(jsbin.panels.named.console) > -1;
      if (!outputPanelOpen && !consolePanelOpen) {
        return;
      }
      // this is a flag that helps detect crashed runners
      if (jsbin.settings.includejs) {
        store.sessionStorage.setItem('runnerPending', 1);
      }

      renderer.postMessage('render', {
        //source: source,
        codes : codes, // modified by lwf
        options: {
          injectCSS: jsbin.state.hasBody && jsbin.panels.focused.id === 'css',
          requested: requested,
          debug: jsbin.settings.debug,
          includeJsInRealtime: jsbin.settings.includejs,
        },
      });

      jsbin.state.hasBody = true;

    });
  };

 return coder.render.renderLivePreview = renderLivePreview;

});