define([
  "skylark-jquery",
   "../jsbin",
   "../updateTitle"
],function ($,jsbin,updateTitle) {
  function watchForSnapshots() {
    /*globals $document, jsbin, updateTitle, saveChecksum*/
    'use strict';

    $(document).on('saved', function () {
      localStorage.latest = jsbin.state.code + '/' + jsbin.state.revision;
    });

    window.addEventListener('storage', function (event) {
      if (event.key === 'latest') {
        var parts = localStorage.latest.split('/');
        if (parts[0] === jsbin.state.code) {
          jsbin.state.latest = false;
          saveChecksum = false; // jshint ignore:line
          jsbin.state.checksum = false;
          updateTitle();
          window.history.replaceState(null, null, jsbin.getURL() + '/edit');
        }
      }
    });
  }


  return coder.editors.snapshot = {
    watchForSnapshots
  };
});