//= require "../vendor/codemirror2/codemirror"
//= require "../vendor/codemirror2/xml"
//= require "../vendor/codemirror2/css"
//= require "../vendor/codemirror2/javascript"
//= require "../vendor/codemirror2/htmlmixed"
//= require "../vendor/codemirror2/searchcursor"

define([
	"skylark-codemirror/CodeMirror",
	"../coder",
    "skylark-codemirror/mode/xml/xml",
    "skylark-codemirror/mode/css/css",
    "skylark-codemirror/mode/javascript/javascript",
    "skylark-codemirror/mode/htmlmixed/htmlmixed",
    "skylark-codemirror/mode/markdown/markdown",

    "skylark-codemirror/addon/comment/comment",

    "skylark-codemirror/addon/selection/active-line",

    "skylark-codemirror/addon/fold/foldcode",
    "skylark-codemirror/addon/fold/foldgutter",
    "skylark-codemirror/addon/fold/brace-fold",
    "skylark-codemirror/addon/fold/xml-fold",
    "skylark-codemirror/addon/fold/indent-fold",
    "skylark-codemirror/addon/fold/markdown-fold",
    "skylark-codemirror/addon/fold/comment-fold",

    "skylark-codemirror/addon/edit/matchbrackets",
    "skylark-codemirror/addon/edit/closebrackets",
    "skylark-codemirror/addon/edit/trailingspace",

    "skylark-codemirror/addon/search/searchcursor",
    "skylark-codemirror/addon/search/search",
    "skylark-codemirror/addon/search/match-highlighter",


    ///"skylark-codemirror/addon/keymap/emacs",
    ///"skylark-codemirror/addon/keymap/sublime",

    "skylark-codemirror/addon/dialog/dialog",

    "skylark-codemirror/addon/hint/anyword-hint",
    "skylark-codemirror/addon/hint/javascript-hint",

    "skylark-codemirror/addon/lint/javascript-lint",
    "skylark-codemirror/addon/lint/lint",

    "skylark-codemirror/addon/tern/tern"
],function(CodeMirror,coder){
 
  // moved from vendor/cm_addons/cm-highlight-line.js
  var WRAP_CLASS = 'CodeMirror-highlight-line';
  var BACK_CLASS = 'CodeMirror-highlight-line-background';

  CodeMirror.defineOption('highlightLine', false, function(cm, val, old) {
    var prev = old && old !== CodeMirror.Init;
    if (val && !prev) {
      cm.state.highlightedLines = [];
      if (typeof val !== 'boolean') {
        updateHighlightedLines(cm, parseLinesToArray(val));
      }
      cm.on('gutterClick', gutterClick);
    } else if (!val && prev) {
      cm.off('gutterClick', gutterClick);
      clearHighlightedLines(cm);
      delete cm.state.highlightedLines;
    }
  });

  CodeMirror.defineExtension('highlightLines', function (lines) {
    if (lines) {
      clearHighlightedLines(this);
      updateHighlightedLines(this, parseLinesToArray(lines));
    } else {
      var active = [].slice.call(this.state.highlightedLines);
      return {
        lines: active,
        string: parseArrayToString(active)
      };
    }
  });

  function parseLinesToArray(str) {
    var active = [];

    if (({}).toString.call(str) === '[object Array]') {
      // wat...oh you gave me an array
      return str;
    }

    if (str.indexOf('-') !== -1) {
      // range
      var range = str.split('-');
      var i = parseInt(range[0], 10);
      var length = parseInt(range[1], 10);
      for (; i <= length; i++) {
        active.push(i-1);
      }
    } else {
      active = [parseInt(str, 10) - 1];
    }

    return active;
  }

  function parseArrayToString(active) {
    if (active.length === 1) {
      return (active[0] + 1) + '';
    } else if (active.length === 0) {
      return '';
    } else {
      return (active[0] + 1) + '-' + (active.slice(-1)[0] + 1);
    }
  }

  function clearHighlightedLines(cm) {
    for (var i = 0; i < cm.state.highlightedLines.length; i++) {
      cm.removeLineClass(cm.state.highlightedLines[i], 'wrap', WRAP_CLASS);
      cm.removeLineClass(cm.state.highlightedLines[i], 'background', BACK_CLASS);
    }
    cm.state.highlightedLines = [];
  }

  function sameArray(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  function highlightLines(cm, lineNumber, event) {
    // copy the array (to avoid creating a reference)
    var active = [].slice.call(cm.state.highlightedLines, 0);

    // shiftKey down gives multi-line highlight support
    if (active.length && event.shiftKey) {
      var i = active[0];
      active = [];

      // then highlight *to* this line
      if (lineNumber < i) {
        // highlight *up* to this new number
        // reduce highlight to this point
        for (; i >= lineNumber; i--) {
          active.push(i);
        }
      } else {
        // reduce highlight to this point
        for (; i <= lineNumber; i++) {
          active.push(i);
        }
      }
    } else if (active.indexOf(lineNumber) === -1) {
      active = [lineNumber]; // only select one line
    }

    // sort the line numbers so when the user gets them in the event, it's vaguely sane.
    active = active.sort(function (a, b) {
      return a - b;
    });

    if (sameArray(cm.state.highlightedLines, active)) {
      clearHighlightedLines(cm);
      if (event) {
        // only signal if it came from a user action
        signal(cm, active);
      }
      return;
    }

    updateHighlightedLines(cm, active, event);
  }

  function updateHighlightedLines(cm, active, event) {
    cm.operation(function() {
      clearHighlightedLines(cm);
      for (var i = 0; i < active.length; i++) {
        cm.addLineClass(active[i], 'wrap', WRAP_CLASS);
        cm.addLineClass(active[i], 'background', BACK_CLASS);
      }
      cm.state.highlightedLines = active;
      if (event) {
        // only signal if it came from a user action
        signal(cm, active);
      }
    });
  }

  function signal(cm, active) {
    CodeMirror.signal(cm, 'highlightLines', cm, active, parseArrayToString(active));
  }

  function gutterClick(cm, lineNumber, gutter, event) {
    if ($(event.target).hasClass('CodeMirror-linenumber')) {
      highlightLines(cm, lineNumber, event);
    }
  }


	return coder.editors.CodeMirror = CodeMirror;
});
