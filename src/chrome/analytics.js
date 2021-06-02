define([
  "skylark-langx",
  "skylark-jquery",
  "skylark-jsbin-chrome/analytics",
   "../jsbin"
],function (langx,$,analytics,jsbin) {
  langx.mixin(analytics ,  {

    universalEditor: function (value) {
      analytics.track('menu', 'universalEditor', value);
    },
    library: function (action, value) {
      analytics.track('menu', action, 'library', value);
    },
    showPanel: function (panelId) {
      analytics.track('panel', 'show', panelId);
    },
    hidePanel: function (panelId) {
      analytics.track('panel', 'hide', panelId);
    },
    enableLiveJS: function (ok) {
      analytics.track('button', 'auto-run js', ok ? 'on' : 'off');
    },
    layout: function (panelsVisible) {
      var layout = [], panel = '';

      for (panel in panelsVisible) {
        layout.push(panel.id);
      }

      analytics.track('layout', 'update', layout.sort().join(',') || 'none');
    },
    run: function (from) {
      analytics.track(from || 'button', 'run with js');
    },
    runconsole: function (from) {
      analytics.track(from || 'button', 'run console');
    }
  });
  return  analytics;
});