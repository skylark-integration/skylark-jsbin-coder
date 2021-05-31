define([
	"skylark-jsbin-render/console",
  "skylark-jquery",
  "../jsbin",
  "../coder",
  "../editors/panels"
],function(jsconsole,$,jsbin,coder,panels){
  // moved from render/console.js

  function upgradeConsolePanel(console) {
    console.setCursorTo = jsconsole.setCursorTo;
    console.$el.click(function (event) {
      if (!$(event.target).closest('#output').length) {
        jsconsole.focus();
      }
    });
    console.reset = function () {
      jsconsole.reset();
    };
    console.settings.render = function (withAlerts) {
      /*
        // unnecessary ? //lwf
      var html = panels.named.html.getCode().trim();
      if (html === "") {
        panels.named.javascript.render().then(function (echo) {
          echo = echo.trim();
          return getPreparedCode().then(function (code) {
            code = code.replace(/<pre>/, '').replace(/<\/pre>/, '');

            setTimeout(function() {
              jsconsole.run({
                echo: echo,
                cmd: code
              });
            }, 0);
          });
        }, function (error) {
          console.warn('Failed to render JavaScript');
          console.warn(error);
        });

        // Tell the iframe to reload
        renderer.postMessage('render', {
          source: '<html>'
        });
      } else {
      */
        renderLivePreview(withAlerts || false);
      //}
    };
    console.settings.show = function () {
      jsconsole.clear();
      // renderLivePreview(true);
      // setTimeout because the renderLivePreview creates the iframe after a timeout
      setTimeout(function () {
        if (panels.named.console.ready && !jsbin.embed) jsconsole.focus();
      }, 0);
    };
    console.settings.hide = function () {
      // Removal code is commented out so that the
      // output iframe is never removed
      if (!panels.named.live.visible) {
        // $live.find('iframe').remove();
      }
    };

    $document.one('jsbinReady', function () {
      var hidebutton = function () {
        $('#runconsole')[this.visible ? 'hide' : 'show']();
      };

      panels.named.live.on('show', hidebutton).on('hide', hidebutton);

      if (panels.named.live.visible) {
        $('#runconsole').hide();
      }

    });
  }

  return coder.render.upgradeConsolePanel = upgradeConsolePanel;
});