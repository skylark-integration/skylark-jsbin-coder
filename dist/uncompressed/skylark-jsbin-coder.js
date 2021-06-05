/**
 * skylark-jsbin-coder - A version of jsbin-editor  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-coder/
 * @license MIT
 */
(function(factory,globals) {
  var define = globals.define,
      require = globals.require,
      isAmd = (typeof define === 'function' && define.amd),
      isCmd = (!isAmd && typeof exports !== 'undefined');

  if (!isAmd && !define) {
    var map = {};
    function absolute(relative, base) {
        if (relative[0]!==".") {
          return relative;
        }
        var stack = base.split("/"),
            parts = relative.split("/");
        stack.pop(); 
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }
    define = globals.define = function(id, deps, factory) {
        if (typeof factory == 'function') {
            map[id] = {
                factory: factory,
                deps: deps.map(function(dep){
                  return absolute(dep,id);
                }),
                resolved: false,
                exports: null
            };
            require(id);
        } else {
            map[id] = {
                factory : null,
                resolved : true,
                exports : factory
            };
        }
    };
    require = globals.require = function(id) {
        if (!map.hasOwnProperty(id)) {
            throw new Error('Module ' + id + ' has not been defined');
        }
        var module = map[id];
        if (!module.resolved) {
            var args = [];

            module.deps.forEach(function(dep){
                args.push(require(dep));
            })

            module.exports = module.factory.apply(globals, args) || null;
            module.resolved = true;
        }
        return module.exports;
    };
  }
  
  if (!define) {
     throw new Error("The module utility (ex: requirejs or skylark-utils) is not loaded!");
  }

  factory(define,require);

  if (!isAmd) {
    var skylarkjs = require("skylark-langx-ns");

    if (isCmd) {
      module.exports = skylarkjs;
    } else {
      globals.skylarkjs  = skylarkjs;
    }
  }

})(function(define,require) {

define('skylark-jsbin-coder/jsbin',[
  "skylark-jsbin-base"
],function(jsbin){
  return jsbin;
});


define('skylark-jsbin-coder/coder',[
	"./jsbin"
],function(jsbin){
	return jsbin.coder = {
		editors : {},
		render : {}
	};
});
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/mode/xml/xml',["../../CodeMirror"], function(CodeMirror) {
"use strict";

var htmlConfig = {
  autoSelfClosers: {'area': true, 'base': true, 'br': true, 'col': true, 'command': true,
                    'embed': true, 'frame': true, 'hr': true, 'img': true, 'input': true,
                    'keygen': true, 'link': true, 'meta': true, 'param': true, 'source': true,
                    'track': true, 'wbr': true, 'menuitem': true},
  implicitlyClosed: {'dd': true, 'li': true, 'optgroup': true, 'option': true, 'p': true,
                     'rp': true, 'rt': true, 'tbody': true, 'td': true, 'tfoot': true,
                     'th': true, 'tr': true},
  contextGrabbers: {
    'dd': {'dd': true, 'dt': true},
    'dt': {'dd': true, 'dt': true},
    'li': {'li': true},
    'option': {'option': true, 'optgroup': true},
    'optgroup': {'optgroup': true},
    'p': {'address': true, 'article': true, 'aside': true, 'blockquote': true, 'dir': true,
          'div': true, 'dl': true, 'fieldset': true, 'footer': true, 'form': true,
          'h1': true, 'h2': true, 'h3': true, 'h4': true, 'h5': true, 'h6': true,
          'header': true, 'hgroup': true, 'hr': true, 'menu': true, 'nav': true, 'ol': true,
          'p': true, 'pre': true, 'section': true, 'table': true, 'ul': true},
    'rp': {'rp': true, 'rt': true},
    'rt': {'rp': true, 'rt': true},
    'tbody': {'tbody': true, 'tfoot': true},
    'td': {'td': true, 'th': true},
    'tfoot': {'tbody': true},
    'th': {'td': true, 'th': true},
    'thead': {'tbody': true, 'tfoot': true},
    'tr': {'tr': true}
  },
  doNotIndent: {"pre": true},
  allowUnquoted: true,
  allowMissing: true,
  caseFold: true
}

var xmlConfig = {
  autoSelfClosers: {},
  implicitlyClosed: {},
  contextGrabbers: {},
  doNotIndent: {},
  allowUnquoted: false,
  allowMissing: false,
  allowMissingTagName: false,
  caseFold: false
}

CodeMirror.defineMode("xml", function(editorConf, config_) {
  var indentUnit = editorConf.indentUnit
  var config = {}
  var defaults = config_.htmlMode ? htmlConfig : xmlConfig
  for (var prop in defaults) config[prop] = defaults[prop]
  for (var prop in config_) config[prop] = config_[prop]

  // Return variables for tokenizers
  var type, setStyle;

  function inText(stream, state) {
    function chain(parser) {
      state.tokenize = parser;
      return parser(stream, state);
    }

    var ch = stream.next();
    if (ch == "<") {
      if (stream.eat("!")) {
        if (stream.eat("[")) {
          if (stream.match("CDATA[")) return chain(inBlock("atom", "]]>"));
          else return null;
        } else if (stream.match("--")) {
          return chain(inBlock("comment", "-->"));
        } else if (stream.match("DOCTYPE", true, true)) {
          stream.eatWhile(/[\w\._\-]/);
          return chain(doctype(1));
        } else {
          return null;
        }
      } else if (stream.eat("?")) {
        stream.eatWhile(/[\w\._\-]/);
        state.tokenize = inBlock("meta", "?>");
        return "meta";
      } else {
        type = stream.eat("/") ? "closeTag" : "openTag";
        state.tokenize = inTag;
        return "tag bracket";
      }
    } else if (ch == "&") {
      var ok;
      if (stream.eat("#")) {
        if (stream.eat("x")) {
          ok = stream.eatWhile(/[a-fA-F\d]/) && stream.eat(";");
        } else {
          ok = stream.eatWhile(/[\d]/) && stream.eat(";");
        }
      } else {
        ok = stream.eatWhile(/[\w\.\-:]/) && stream.eat(";");
      }
      return ok ? "atom" : "error";
    } else {
      stream.eatWhile(/[^&<]/);
      return null;
    }
  }
  inText.isInText = true;

  function inTag(stream, state) {
    var ch = stream.next();
    if (ch == ">" || (ch == "/" && stream.eat(">"))) {
      state.tokenize = inText;
      type = ch == ">" ? "endTag" : "selfcloseTag";
      return "tag bracket";
    } else if (ch == "=") {
      type = "equals";
      return null;
    } else if (ch == "<") {
      state.tokenize = inText;
      state.state = baseState;
      state.tagName = state.tagStart = null;
      var next = state.tokenize(stream, state);
      return next ? next + " tag error" : "tag error";
    } else if (/[\'\"]/.test(ch)) {
      state.tokenize = inAttribute(ch);
      state.stringStartCol = stream.column();
      return state.tokenize(stream, state);
    } else {
      stream.match(/^[^\s\u00a0=<>\"\']*[^\s\u00a0=<>\"\'\/]/);
      return "word";
    }
  }

  function inAttribute(quote) {
    var closure = function(stream, state) {
      while (!stream.eol()) {
        if (stream.next() == quote) {
          state.tokenize = inTag;
          break;
        }
      }
      return "string";
    };
    closure.isInAttribute = true;
    return closure;
  }

  function inBlock(style, terminator) {
    return function(stream, state) {
      while (!stream.eol()) {
        if (stream.match(terminator)) {
          state.tokenize = inText;
          break;
        }
        stream.next();
      }
      return style;
    }
  }

  function doctype(depth) {
    return function(stream, state) {
      var ch;
      while ((ch = stream.next()) != null) {
        if (ch == "<") {
          state.tokenize = doctype(depth + 1);
          return state.tokenize(stream, state);
        } else if (ch == ">") {
          if (depth == 1) {
            state.tokenize = inText;
            break;
          } else {
            state.tokenize = doctype(depth - 1);
            return state.tokenize(stream, state);
          }
        }
      }
      return "meta";
    };
  }

  function Context(state, tagName, startOfLine) {
    this.prev = state.context;
    this.tagName = tagName;
    this.indent = state.indented;
    this.startOfLine = startOfLine;
    if (config.doNotIndent.hasOwnProperty(tagName) || (state.context && state.context.noIndent))
      this.noIndent = true;
  }
  function popContext(state) {
    if (state.context) state.context = state.context.prev;
  }
  function maybePopContext(state, nextTagName) {
    var parentTagName;
    while (true) {
      if (!state.context) {
        return;
      }
      parentTagName = state.context.tagName;
      if (!config.contextGrabbers.hasOwnProperty(parentTagName) ||
          !config.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)) {
        return;
      }
      popContext(state);
    }
  }

  function baseState(type, stream, state) {
    if (type == "openTag") {
      state.tagStart = stream.column();
      return tagNameState;
    } else if (type == "closeTag") {
      return closeTagNameState;
    } else {
      return baseState;
    }
  }
  function tagNameState(type, stream, state) {
    if (type == "word") {
      state.tagName = stream.current();
      setStyle = "tag";
      return attrState;
    } else if (config.allowMissingTagName && type == "endTag") {
      setStyle = "tag bracket";
      return attrState(type, stream, state);
    } else {
      setStyle = "error";
      return tagNameState;
    }
  }
  function closeTagNameState(type, stream, state) {
    if (type == "word") {
      var tagName = stream.current();
      if (state.context && state.context.tagName != tagName &&
          config.implicitlyClosed.hasOwnProperty(state.context.tagName))
        popContext(state);
      if ((state.context && state.context.tagName == tagName) || config.matchClosing === false) {
        setStyle = "tag";
        return closeState;
      } else {
        setStyle = "tag error";
        return closeStateErr;
      }
    } else if (config.allowMissingTagName && type == "endTag") {
      setStyle = "tag bracket";
      return closeState(type, stream, state);
    } else {
      setStyle = "error";
      return closeStateErr;
    }
  }

  function closeState(type, _stream, state) {
    if (type != "endTag") {
      setStyle = "error";
      return closeState;
    }
    popContext(state);
    return baseState;
  }
  function closeStateErr(type, stream, state) {
    setStyle = "error";
    return closeState(type, stream, state);
  }

  function attrState(type, _stream, state) {
    if (type == "word") {
      setStyle = "attribute";
      return attrEqState;
    } else if (type == "endTag" || type == "selfcloseTag") {
      var tagName = state.tagName, tagStart = state.tagStart;
      state.tagName = state.tagStart = null;
      if (type == "selfcloseTag" ||
          config.autoSelfClosers.hasOwnProperty(tagName)) {
        maybePopContext(state, tagName);
      } else {
        maybePopContext(state, tagName);
        state.context = new Context(state, tagName, tagStart == state.indented);
      }
      return baseState;
    }
    setStyle = "error";
    return attrState;
  }
  function attrEqState(type, stream, state) {
    if (type == "equals") return attrValueState;
    if (!config.allowMissing) setStyle = "error";
    return attrState(type, stream, state);
  }
  function attrValueState(type, stream, state) {
    if (type == "string") return attrContinuedState;
    if (type == "word" && config.allowUnquoted) {setStyle = "string"; return attrState;}
    setStyle = "error";
    return attrState(type, stream, state);
  }
  function attrContinuedState(type, stream, state) {
    if (type == "string") return attrContinuedState;
    return attrState(type, stream, state);
  }

  return {
    startState: function(baseIndent) {
      var state = {tokenize: inText,
                   state: baseState,
                   indented: baseIndent || 0,
                   tagName: null, tagStart: null,
                   context: null}
      if (baseIndent != null) state.baseIndent = baseIndent
      return state
    },

    token: function(stream, state) {
      if (!state.tagName && stream.sol())
        state.indented = stream.indentation();

      if (stream.eatSpace()) return null;
      type = null;
      var style = state.tokenize(stream, state);
      if ((style || type) && style != "comment") {
        setStyle = null;
        state.state = state.state(type || style, stream, state);
        if (setStyle)
          style = setStyle == "error" ? style + " error" : setStyle;
      }
      return style;
    },

    indent: function(state, textAfter, fullLine) {
      var context = state.context;
      // Indent multi-line strings (e.g. css).
      if (state.tokenize.isInAttribute) {
        if (state.tagStart == state.indented)
          return state.stringStartCol + 1;
        else
          return state.indented + indentUnit;
      }
      if (context && context.noIndent) return CodeMirror.Pass;
      if (state.tokenize != inTag && state.tokenize != inText)
        return fullLine ? fullLine.match(/^(\s*)/)[0].length : 0;
      // Indent the starts of attribute names.
      if (state.tagName) {
        if (config.multilineTagIndentPastTag !== false)
          return state.tagStart + state.tagName.length + 2;
        else
          return state.tagStart + indentUnit * (config.multilineTagIndentFactor || 1);
      }
      if (config.alignCDATA && /<!\[CDATA\[/.test(textAfter)) return 0;
      var tagAfter = textAfter && /^<(\/)?([\w_:\.-]*)/.exec(textAfter);
      if (tagAfter && tagAfter[1]) { // Closing tag spotted
        while (context) {
          if (context.tagName == tagAfter[2]) {
            context = context.prev;
            break;
          } else if (config.implicitlyClosed.hasOwnProperty(context.tagName)) {
            context = context.prev;
          } else {
            break;
          }
        }
      } else if (tagAfter) { // Opening tag spotted
        while (context) {
          var grabbers = config.contextGrabbers[context.tagName];
          if (grabbers && grabbers.hasOwnProperty(tagAfter[2]))
            context = context.prev;
          else
            break;
        }
      }
      while (context && context.prev && !context.startOfLine)
        context = context.prev;
      if (context) return context.indent + indentUnit;
      else return state.baseIndent || 0;
    },

    electricInput: /<\/[\s\w:]+>$/,
    blockCommentStart: "<!--",
    blockCommentEnd: "-->",

    configuration: config.htmlMode ? "html" : "xml",
    helperType: config.htmlMode ? "html" : "xml",

    skipAttribute: function(state) {
      if (state.state == attrValueState)
        state.state = attrState
    }
  };
});

CodeMirror.defineMIME("text/xml", "xml");
CodeMirror.defineMIME("application/xml", "xml");
if (!CodeMirror.mimeModes.hasOwnProperty("text/html"))
  CodeMirror.defineMIME("text/html", {name: "xml", htmlMode: true});

});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/mode/css/css',["../../CodeMirror"], function(CodeMirror) {
"use strict";

CodeMirror.defineMode("css", function(config, parserConfig) {
  var inline = parserConfig.inline
  if (!parserConfig.propertyKeywords) parserConfig = CodeMirror.resolveMode("text/css");

  var indentUnit = config.indentUnit,
      tokenHooks = parserConfig.tokenHooks,
      documentTypes = parserConfig.documentTypes || {},
      mediaTypes = parserConfig.mediaTypes || {},
      mediaFeatures = parserConfig.mediaFeatures || {},
      mediaValueKeywords = parserConfig.mediaValueKeywords || {},
      propertyKeywords = parserConfig.propertyKeywords || {},
      nonStandardPropertyKeywords = parserConfig.nonStandardPropertyKeywords || {},
      fontProperties = parserConfig.fontProperties || {},
      counterDescriptors = parserConfig.counterDescriptors || {},
      colorKeywords = parserConfig.colorKeywords || {},
      valueKeywords = parserConfig.valueKeywords || {},
      allowNested = parserConfig.allowNested,
      lineComment = parserConfig.lineComment,
      supportsAtComponent = parserConfig.supportsAtComponent === true;

  var type, override;
  function ret(style, tp) { type = tp; return style; }

  // Tokenizers

  function tokenBase(stream, state) {
    var ch = stream.next();
    if (tokenHooks[ch]) {
      var result = tokenHooks[ch](stream, state);
      if (result !== false) return result;
    }
    if (ch == "@") {
      stream.eatWhile(/[\w\\\-]/);
      return ret("def", stream.current());
    } else if (ch == "=" || (ch == "~" || ch == "|") && stream.eat("=")) {
      return ret(null, "compare");
    } else if (ch == "\"" || ch == "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    } else if (ch == "#") {
      stream.eatWhile(/[\w\\\-]/);
      return ret("atom", "hash");
    } else if (ch == "!") {
      stream.match(/^\s*\w*/);
      return ret("keyword", "important");
    } else if (/\d/.test(ch) || ch == "." && stream.eat(/\d/)) {
      stream.eatWhile(/[\w.%]/);
      return ret("number", "unit");
    } else if (ch === "-") {
      if (/[\d.]/.test(stream.peek())) {
        stream.eatWhile(/[\w.%]/);
        return ret("number", "unit");
      } else if (stream.match(/^-[\w\\\-]*/)) {
        stream.eatWhile(/[\w\\\-]/);
        if (stream.match(/^\s*:/, false))
          return ret("variable-2", "variable-definition");
        return ret("variable-2", "variable");
      } else if (stream.match(/^\w+-/)) {
        return ret("meta", "meta");
      }
    } else if (/[,+>*\/]/.test(ch)) {
      return ret(null, "select-op");
    } else if (ch == "." && stream.match(/^-?[_a-z][_a-z0-9-]*/i)) {
      return ret("qualifier", "qualifier");
    } else if (/[:;{}\[\]\(\)]/.test(ch)) {
      return ret(null, ch);
    } else if (stream.match(/[\w-.]+(?=\()/)) {
      if (/^(url(-prefix)?|domain|regexp)$/.test(stream.current().toLowerCase())) {
        state.tokenize = tokenParenthesized;
      }
      return ret("variable callee", "variable");
    } else if (/[\w\\\-]/.test(ch)) {
      stream.eatWhile(/[\w\\\-]/);
      return ret("property", "word");
    } else {
      return ret(null, null);
    }
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, ch;
      while ((ch = stream.next()) != null) {
        if (ch == quote && !escaped) {
          if (quote == ")") stream.backUp(1);
          break;
        }
        escaped = !escaped && ch == "\\";
      }
      if (ch == quote || !escaped && quote != ")") state.tokenize = null;
      return ret("string", "string");
    };
  }

  function tokenParenthesized(stream, state) {
    stream.next(); // Must be '('
    if (!stream.match(/\s*[\"\')]/, false))
      state.tokenize = tokenString(")");
    else
      state.tokenize = null;
    return ret(null, "(");
  }

  // Context management

  function Context(type, indent, prev) {
    this.type = type;
    this.indent = indent;
    this.prev = prev;
  }

  function pushContext(state, stream, type, indent) {
    state.context = new Context(type, stream.indentation() + (indent === false ? 0 : indentUnit), state.context);
    return type;
  }

  function popContext(state) {
    if (state.context.prev)
      state.context = state.context.prev;
    return state.context.type;
  }

  function pass(type, stream, state) {
    return states[state.context.type](type, stream, state);
  }
  function popAndPass(type, stream, state, n) {
    for (var i = n || 1; i > 0; i--)
      state.context = state.context.prev;
    return pass(type, stream, state);
  }

  // Parser

  function wordAsValue(stream) {
    var word = stream.current().toLowerCase();
    if (valueKeywords.hasOwnProperty(word))
      override = "atom";
    else if (colorKeywords.hasOwnProperty(word))
      override = "keyword";
    else
      override = "variable";
  }

  var states = {};

  states.top = function(type, stream, state) {
    if (type == "{") {
      return pushContext(state, stream, "block");
    } else if (type == "}" && state.context.prev) {
      return popContext(state);
    } else if (supportsAtComponent && /@component/i.test(type)) {
      return pushContext(state, stream, "atComponentBlock");
    } else if (/^@(-moz-)?document$/i.test(type)) {
      return pushContext(state, stream, "documentTypes");
    } else if (/^@(media|supports|(-moz-)?document|import)$/i.test(type)) {
      return pushContext(state, stream, "atBlock");
    } else if (/^@(font-face|counter-style)/i.test(type)) {
      state.stateArg = type;
      return "restricted_atBlock_before";
    } else if (/^@(-(moz|ms|o|webkit)-)?keyframes$/i.test(type)) {
      return "keyframes";
    } else if (type && type.charAt(0) == "@") {
      return pushContext(state, stream, "at");
    } else if (type == "hash") {
      override = "builtin";
    } else if (type == "word") {
      override = "tag";
    } else if (type == "variable-definition") {
      return "maybeprop";
    } else if (type == "interpolation") {
      return pushContext(state, stream, "interpolation");
    } else if (type == ":") {
      return "pseudo";
    } else if (allowNested && type == "(") {
      return pushContext(state, stream, "parens");
    }
    return state.context.type;
  };

  states.block = function(type, stream, state) {
    if (type == "word") {
      var word = stream.current().toLowerCase();
      if (propertyKeywords.hasOwnProperty(word)) {
        override = "property";
        return "maybeprop";
      } else if (nonStandardPropertyKeywords.hasOwnProperty(word)) {
        override = "string-2";
        return "maybeprop";
      } else if (allowNested) {
        override = stream.match(/^\s*:(?:\s|$)/, false) ? "property" : "tag";
        return "block";
      } else {
        override += " error";
        return "maybeprop";
      }
    } else if (type == "meta") {
      return "block";
    } else if (!allowNested && (type == "hash" || type == "qualifier")) {
      override = "error";
      return "block";
    } else {
      return states.top(type, stream, state);
    }
  };

  states.maybeprop = function(type, stream, state) {
    if (type == ":") return pushContext(state, stream, "prop");
    return pass(type, stream, state);
  };

  states.prop = function(type, stream, state) {
    if (type == ";") return popContext(state);
    if (type == "{" && allowNested) return pushContext(state, stream, "propBlock");
    if (type == "}" || type == "{") return popAndPass(type, stream, state);
    if (type == "(") return pushContext(state, stream, "parens");

    if (type == "hash" && !/^#([0-9a-fA-f]{3,4}|[0-9a-fA-f]{6}|[0-9a-fA-f]{8})$/.test(stream.current())) {
      override += " error";
    } else if (type == "word") {
      wordAsValue(stream);
    } else if (type == "interpolation") {
      return pushContext(state, stream, "interpolation");
    }
    return "prop";
  };

  states.propBlock = function(type, _stream, state) {
    if (type == "}") return popContext(state);
    if (type == "word") { override = "property"; return "maybeprop"; }
    return state.context.type;
  };

  states.parens = function(type, stream, state) {
    if (type == "{" || type == "}") return popAndPass(type, stream, state);
    if (type == ")") return popContext(state);
    if (type == "(") return pushContext(state, stream, "parens");
    if (type == "interpolation") return pushContext(state, stream, "interpolation");
    if (type == "word") wordAsValue(stream);
    return "parens";
  };

  states.pseudo = function(type, stream, state) {
    if (type == "meta") return "pseudo";

    if (type == "word") {
      override = "variable-3";
      return state.context.type;
    }
    return pass(type, stream, state);
  };

  states.documentTypes = function(type, stream, state) {
    if (type == "word" && documentTypes.hasOwnProperty(stream.current())) {
      override = "tag";
      return state.context.type;
    } else {
      return states.atBlock(type, stream, state);
    }
  };

  states.atBlock = function(type, stream, state) {
    if (type == "(") return pushContext(state, stream, "atBlock_parens");
    if (type == "}" || type == ";") return popAndPass(type, stream, state);
    if (type == "{") return popContext(state) && pushContext(state, stream, allowNested ? "block" : "top");

    if (type == "interpolation") return pushContext(state, stream, "interpolation");

    if (type == "word") {
      var word = stream.current().toLowerCase();
      if (word == "only" || word == "not" || word == "and" || word == "or")
        override = "keyword";
      else if (mediaTypes.hasOwnProperty(word))
        override = "attribute";
      else if (mediaFeatures.hasOwnProperty(word))
        override = "property";
      else if (mediaValueKeywords.hasOwnProperty(word))
        override = "keyword";
      else if (propertyKeywords.hasOwnProperty(word))
        override = "property";
      else if (nonStandardPropertyKeywords.hasOwnProperty(word))
        override = "string-2";
      else if (valueKeywords.hasOwnProperty(word))
        override = "atom";
      else if (colorKeywords.hasOwnProperty(word))
        override = "keyword";
      else
        override = "error";
    }
    return state.context.type;
  };

  states.atComponentBlock = function(type, stream, state) {
    if (type == "}")
      return popAndPass(type, stream, state);
    if (type == "{")
      return popContext(state) && pushContext(state, stream, allowNested ? "block" : "top", false);
    if (type == "word")
      override = "error";
    return state.context.type;
  };

  states.atBlock_parens = function(type, stream, state) {
    if (type == ")") return popContext(state);
    if (type == "{" || type == "}") return popAndPass(type, stream, state, 2);
    return states.atBlock(type, stream, state);
  };

  states.restricted_atBlock_before = function(type, stream, state) {
    if (type == "{")
      return pushContext(state, stream, "restricted_atBlock");
    if (type == "word" && state.stateArg == "@counter-style") {
      override = "variable";
      return "restricted_atBlock_before";
    }
    return pass(type, stream, state);
  };

  states.restricted_atBlock = function(type, stream, state) {
    if (type == "}") {
      state.stateArg = null;
      return popContext(state);
    }
    if (type == "word") {
      if ((state.stateArg == "@font-face" && !fontProperties.hasOwnProperty(stream.current().toLowerCase())) ||
          (state.stateArg == "@counter-style" && !counterDescriptors.hasOwnProperty(stream.current().toLowerCase())))
        override = "error";
      else
        override = "property";
      return "maybeprop";
    }
    return "restricted_atBlock";
  };

  states.keyframes = function(type, stream, state) {
    if (type == "word") { override = "variable"; return "keyframes"; }
    if (type == "{") return pushContext(state, stream, "top");
    return pass(type, stream, state);
  };

  states.at = function(type, stream, state) {
    if (type == ";") return popContext(state);
    if (type == "{" || type == "}") return popAndPass(type, stream, state);
    if (type == "word") override = "tag";
    else if (type == "hash") override = "builtin";
    return "at";
  };

  states.interpolation = function(type, stream, state) {
    if (type == "}") return popContext(state);
    if (type == "{" || type == ";") return popAndPass(type, stream, state);
    if (type == "word") override = "variable";
    else if (type != "variable" && type != "(" && type != ")") override = "error";
    return "interpolation";
  };

  return {
    startState: function(base) {
      return {tokenize: null,
              state: inline ? "block" : "top",
              stateArg: null,
              context: new Context(inline ? "block" : "top", base || 0, null)};
    },

    token: function(stream, state) {
      if (!state.tokenize && stream.eatSpace()) return null;
      var style = (state.tokenize || tokenBase)(stream, state);
      if (style && typeof style == "object") {
        type = style[1];
        style = style[0];
      }
      override = style;
      if (type != "comment")
        state.state = states[state.state](type, stream, state);
      return override;
    },

    indent: function(state, textAfter) {
      var cx = state.context, ch = textAfter && textAfter.charAt(0);
      var indent = cx.indent;
      if (cx.type == "prop" && (ch == "}" || ch == ")")) cx = cx.prev;
      if (cx.prev) {
        if (ch == "}" && (cx.type == "block" || cx.type == "top" ||
                          cx.type == "interpolation" || cx.type == "restricted_atBlock")) {
          // Resume indentation from parent context.
          cx = cx.prev;
          indent = cx.indent;
        } else if (ch == ")" && (cx.type == "parens" || cx.type == "atBlock_parens") ||
            ch == "{" && (cx.type == "at" || cx.type == "atBlock")) {
          // Dedent relative to current context.
          indent = Math.max(0, cx.indent - indentUnit);
        }
      }
      return indent;
    },

    electricChars: "}",
    blockCommentStart: "/*",
    blockCommentEnd: "*/",
    blockCommentContinue: " * ",
    lineComment: lineComment,
    fold: "brace"
  };
});

  function keySet(array) {
    var keys = {};
    for (var i = 0; i < array.length; ++i) {
      keys[array[i].toLowerCase()] = true;
    }
    return keys;
  }

  var documentTypes_ = [
    "domain", "regexp", "url", "url-prefix"
  ], documentTypes = keySet(documentTypes_);

  var mediaTypes_ = [
    "all", "aural", "braille", "handheld", "print", "projection", "screen",
    "tty", "tv", "embossed"
  ], mediaTypes = keySet(mediaTypes_);

  var mediaFeatures_ = [
    "width", "min-width", "max-width", "height", "min-height", "max-height",
    "device-width", "min-device-width", "max-device-width", "device-height",
    "min-device-height", "max-device-height", "aspect-ratio",
    "min-aspect-ratio", "max-aspect-ratio", "device-aspect-ratio",
    "min-device-aspect-ratio", "max-device-aspect-ratio", "color", "min-color",
    "max-color", "color-index", "min-color-index", "max-color-index",
    "monochrome", "min-monochrome", "max-monochrome", "resolution",
    "min-resolution", "max-resolution", "scan", "grid", "orientation",
    "device-pixel-ratio", "min-device-pixel-ratio", "max-device-pixel-ratio",
    "pointer", "any-pointer", "hover", "any-hover"
  ], mediaFeatures = keySet(mediaFeatures_);

  var mediaValueKeywords_ = [
    "landscape", "portrait", "none", "coarse", "fine", "on-demand", "hover",
    "interlace", "progressive"
  ], mediaValueKeywords = keySet(mediaValueKeywords_);

  var propertyKeywords_ = [
    "align-content", "align-items", "align-self", "alignment-adjust",
    "alignment-baseline", "anchor-point", "animation", "animation-delay",
    "animation-direction", "animation-duration", "animation-fill-mode",
    "animation-iteration-count", "animation-name", "animation-play-state",
    "animation-timing-function", "appearance", "azimuth", "backface-visibility",
    "background", "background-attachment", "background-blend-mode", "background-clip",
    "background-color", "background-image", "background-origin", "background-position",
    "background-repeat", "background-size", "baseline-shift", "binding",
    "bleed", "bookmark-label", "bookmark-level", "bookmark-state",
    "bookmark-target", "border", "border-bottom", "border-bottom-color",
    "border-bottom-left-radius", "border-bottom-right-radius",
    "border-bottom-style", "border-bottom-width", "border-collapse",
    "border-color", "border-image", "border-image-outset",
    "border-image-repeat", "border-image-slice", "border-image-source",
    "border-image-width", "border-left", "border-left-color",
    "border-left-style", "border-left-width", "border-radius", "border-right",
    "border-right-color", "border-right-style", "border-right-width",
    "border-spacing", "border-style", "border-top", "border-top-color",
    "border-top-left-radius", "border-top-right-radius", "border-top-style",
    "border-top-width", "border-width", "bottom", "box-decoration-break",
    "box-shadow", "box-sizing", "break-after", "break-before", "break-inside",
    "caption-side", "caret-color", "clear", "clip", "color", "color-profile", "column-count",
    "column-fill", "column-gap", "column-rule", "column-rule-color",
    "column-rule-style", "column-rule-width", "column-span", "column-width",
    "columns", "content", "counter-increment", "counter-reset", "crop", "cue",
    "cue-after", "cue-before", "cursor", "direction", "display",
    "dominant-baseline", "drop-initial-after-adjust",
    "drop-initial-after-align", "drop-initial-before-adjust",
    "drop-initial-before-align", "drop-initial-size", "drop-initial-value",
    "elevation", "empty-cells", "fit", "fit-position", "flex", "flex-basis",
    "flex-direction", "flex-flow", "flex-grow", "flex-shrink", "flex-wrap",
    "float", "float-offset", "flow-from", "flow-into", "font", "font-feature-settings",
    "font-family", "font-kerning", "font-language-override", "font-size", "font-size-adjust",
    "font-stretch", "font-style", "font-synthesis", "font-variant",
    "font-variant-alternates", "font-variant-caps", "font-variant-east-asian",
    "font-variant-ligatures", "font-variant-numeric", "font-variant-position",
    "font-weight", "grid", "grid-area", "grid-auto-columns", "grid-auto-flow",
    "grid-auto-rows", "grid-column", "grid-column-end", "grid-column-gap",
    "grid-column-start", "grid-gap", "grid-row", "grid-row-end", "grid-row-gap",
    "grid-row-start", "grid-template", "grid-template-areas", "grid-template-columns",
    "grid-template-rows", "hanging-punctuation", "height", "hyphens",
    "icon", "image-orientation", "image-rendering", "image-resolution",
    "inline-box-align", "justify-content", "justify-items", "justify-self", "left", "letter-spacing",
    "line-break", "line-height", "line-stacking", "line-stacking-ruby",
    "line-stacking-shift", "line-stacking-strategy", "list-style",
    "list-style-image", "list-style-position", "list-style-type", "margin",
    "margin-bottom", "margin-left", "margin-right", "margin-top",
    "marks", "marquee-direction", "marquee-loop",
    "marquee-play-count", "marquee-speed", "marquee-style", "max-height",
    "max-width", "min-height", "min-width", "mix-blend-mode", "move-to", "nav-down", "nav-index",
    "nav-left", "nav-right", "nav-up", "object-fit", "object-position",
    "opacity", "order", "orphans", "outline",
    "outline-color", "outline-offset", "outline-style", "outline-width",
    "overflow", "overflow-style", "overflow-wrap", "overflow-x", "overflow-y",
    "padding", "padding-bottom", "padding-left", "padding-right", "padding-top",
    "page", "page-break-after", "page-break-before", "page-break-inside",
    "page-policy", "pause", "pause-after", "pause-before", "perspective",
    "perspective-origin", "pitch", "pitch-range", "place-content", "place-items", "place-self", "play-during", "position",
    "presentation-level", "punctuation-trim", "quotes", "region-break-after",
    "region-break-before", "region-break-inside", "region-fragment",
    "rendering-intent", "resize", "rest", "rest-after", "rest-before", "richness",
    "right", "rotation", "rotation-point", "ruby-align", "ruby-overhang",
    "ruby-position", "ruby-span", "shape-image-threshold", "shape-inside", "shape-margin",
    "shape-outside", "size", "speak", "speak-as", "speak-header",
    "speak-numeral", "speak-punctuation", "speech-rate", "stress", "string-set",
    "tab-size", "table-layout", "target", "target-name", "target-new",
    "target-position", "text-align", "text-align-last", "text-decoration",
    "text-decoration-color", "text-decoration-line", "text-decoration-skip",
    "text-decoration-style", "text-emphasis", "text-emphasis-color",
    "text-emphasis-position", "text-emphasis-style", "text-height",
    "text-indent", "text-justify", "text-outline", "text-overflow", "text-shadow",
    "text-size-adjust", "text-space-collapse", "text-transform", "text-underline-position",
    "text-wrap", "top", "transform", "transform-origin", "transform-style",
    "transition", "transition-delay", "transition-duration",
    "transition-property", "transition-timing-function", "unicode-bidi",
    "user-select", "vertical-align", "visibility", "voice-balance", "voice-duration",
    "voice-family", "voice-pitch", "voice-range", "voice-rate", "voice-stress",
    "voice-volume", "volume", "white-space", "widows", "width", "will-change", "word-break",
    "word-spacing", "word-wrap", "z-index",
    // SVG-specific
    "clip-path", "clip-rule", "mask", "enable-background", "filter", "flood-color",
    "flood-opacity", "lighting-color", "stop-color", "stop-opacity", "pointer-events",
    "color-interpolation", "color-interpolation-filters",
    "color-rendering", "fill", "fill-opacity", "fill-rule", "image-rendering",
    "marker", "marker-end", "marker-mid", "marker-start", "shape-rendering", "stroke",
    "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin",
    "stroke-miterlimit", "stroke-opacity", "stroke-width", "text-rendering",
    "baseline-shift", "dominant-baseline", "glyph-orientation-horizontal",
    "glyph-orientation-vertical", "text-anchor", "writing-mode"
  ], propertyKeywords = keySet(propertyKeywords_);

  var nonStandardPropertyKeywords_ = [
    "scrollbar-arrow-color", "scrollbar-base-color", "scrollbar-dark-shadow-color",
    "scrollbar-face-color", "scrollbar-highlight-color", "scrollbar-shadow-color",
    "scrollbar-3d-light-color", "scrollbar-track-color", "shape-inside",
    "searchfield-cancel-button", "searchfield-decoration", "searchfield-results-button",
    "searchfield-results-decoration", "zoom"
  ], nonStandardPropertyKeywords = keySet(nonStandardPropertyKeywords_);

  var fontProperties_ = [
    "font-family", "src", "unicode-range", "font-variant", "font-feature-settings",
    "font-stretch", "font-weight", "font-style"
  ], fontProperties = keySet(fontProperties_);

  var counterDescriptors_ = [
    "additive-symbols", "fallback", "negative", "pad", "prefix", "range",
    "speak-as", "suffix", "symbols", "system"
  ], counterDescriptors = keySet(counterDescriptors_);

  var colorKeywords_ = [
    "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige",
    "bisque", "black", "blanchedalmond", "blue", "blueviolet", "brown",
    "burlywood", "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue",
    "cornsilk", "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod",
    "darkgray", "darkgreen", "darkkhaki", "darkmagenta", "darkolivegreen",
    "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen",
    "darkslateblue", "darkslategray", "darkturquoise", "darkviolet",
    "deeppink", "deepskyblue", "dimgray", "dodgerblue", "firebrick",
    "floralwhite", "forestgreen", "fuchsia", "gainsboro", "ghostwhite",
    "gold", "goldenrod", "gray", "grey", "green", "greenyellow", "honeydew",
    "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender",
    "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral",
    "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightpink",
    "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray",
    "lightsteelblue", "lightyellow", "lime", "limegreen", "linen", "magenta",
    "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple",
    "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise",
    "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin",
    "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange", "orangered",
    "orchid", "palegoldenrod", "palegreen", "paleturquoise", "palevioletred",
    "papayawhip", "peachpuff", "peru", "pink", "plum", "powderblue",
    "purple", "rebeccapurple", "red", "rosybrown", "royalblue", "saddlebrown",
    "salmon", "sandybrown", "seagreen", "seashell", "sienna", "silver", "skyblue",
    "slateblue", "slategray", "snow", "springgreen", "steelblue", "tan",
    "teal", "thistle", "tomato", "turquoise", "violet", "wheat", "white",
    "whitesmoke", "yellow", "yellowgreen"
  ], colorKeywords = keySet(colorKeywords_);

  var valueKeywords_ = [
    "above", "absolute", "activeborder", "additive", "activecaption", "afar",
    "after-white-space", "ahead", "alias", "all", "all-scroll", "alphabetic", "alternate",
    "always", "amharic", "amharic-abegede", "antialiased", "appworkspace",
    "arabic-indic", "armenian", "asterisks", "attr", "auto", "auto-flow", "avoid", "avoid-column", "avoid-page",
    "avoid-region", "background", "backwards", "baseline", "below", "bidi-override", "binary",
    "bengali", "blink", "block", "block-axis", "bold", "bolder", "border", "border-box",
    "both", "bottom", "break", "break-all", "break-word", "bullets", "button", "button-bevel",
    "buttonface", "buttonhighlight", "buttonshadow", "buttontext", "calc", "cambodian",
    "capitalize", "caps-lock-indicator", "caption", "captiontext", "caret",
    "cell", "center", "checkbox", "circle", "cjk-decimal", "cjk-earthly-branch",
    "cjk-heavenly-stem", "cjk-ideographic", "clear", "clip", "close-quote",
    "col-resize", "collapse", "color", "color-burn", "color-dodge", "column", "column-reverse",
    "compact", "condensed", "contain", "content", "contents",
    "content-box", "context-menu", "continuous", "copy", "counter", "counters", "cover", "crop",
    "cross", "crosshair", "currentcolor", "cursive", "cyclic", "darken", "dashed", "decimal",
    "decimal-leading-zero", "default", "default-button", "dense", "destination-atop",
    "destination-in", "destination-out", "destination-over", "devanagari", "difference",
    "disc", "discard", "disclosure-closed", "disclosure-open", "document",
    "dot-dash", "dot-dot-dash",
    "dotted", "double", "down", "e-resize", "ease", "ease-in", "ease-in-out", "ease-out",
    "element", "ellipse", "ellipsis", "embed", "end", "ethiopic", "ethiopic-abegede",
    "ethiopic-abegede-am-et", "ethiopic-abegede-gez", "ethiopic-abegede-ti-er",
    "ethiopic-abegede-ti-et", "ethiopic-halehame-aa-er",
    "ethiopic-halehame-aa-et", "ethiopic-halehame-am-et",
    "ethiopic-halehame-gez", "ethiopic-halehame-om-et",
    "ethiopic-halehame-sid-et", "ethiopic-halehame-so-et",
    "ethiopic-halehame-ti-er", "ethiopic-halehame-ti-et", "ethiopic-halehame-tig",
    "ethiopic-numeric", "ew-resize", "exclusion", "expanded", "extends", "extra-condensed",
    "extra-expanded", "fantasy", "fast", "fill", "fixed", "flat", "flex", "flex-end", "flex-start", "footnotes",
    "forwards", "from", "geometricPrecision", "georgian", "graytext", "grid", "groove",
    "gujarati", "gurmukhi", "hand", "hangul", "hangul-consonant", "hard-light", "hebrew",
    "help", "hidden", "hide", "higher", "highlight", "highlighttext",
    "hiragana", "hiragana-iroha", "horizontal", "hsl", "hsla", "hue", "icon", "ignore",
    "inactiveborder", "inactivecaption", "inactivecaptiontext", "infinite",
    "infobackground", "infotext", "inherit", "initial", "inline", "inline-axis",
    "inline-block", "inline-flex", "inline-grid", "inline-table", "inset", "inside", "intrinsic", "invert",
    "italic", "japanese-formal", "japanese-informal", "justify", "kannada",
    "katakana", "katakana-iroha", "keep-all", "khmer",
    "korean-hangul-formal", "korean-hanja-formal", "korean-hanja-informal",
    "landscape", "lao", "large", "larger", "left", "level", "lighter", "lighten",
    "line-through", "linear", "linear-gradient", "lines", "list-item", "listbox", "listitem",
    "local", "logical", "loud", "lower", "lower-alpha", "lower-armenian",
    "lower-greek", "lower-hexadecimal", "lower-latin", "lower-norwegian",
    "lower-roman", "lowercase", "ltr", "luminosity", "malayalam", "match", "matrix", "matrix3d",
    "media-controls-background", "media-current-time-display",
    "media-fullscreen-button", "media-mute-button", "media-play-button",
    "media-return-to-realtime-button", "media-rewind-button",
    "media-seek-back-button", "media-seek-forward-button", "media-slider",
    "media-sliderthumb", "media-time-remaining-display", "media-volume-slider",
    "media-volume-slider-container", "media-volume-sliderthumb", "medium",
    "menu", "menulist", "menulist-button", "menulist-text",
    "menulist-textfield", "menutext", "message-box", "middle", "min-intrinsic",
    "mix", "mongolian", "monospace", "move", "multiple", "multiply", "myanmar", "n-resize",
    "narrower", "ne-resize", "nesw-resize", "no-close-quote", "no-drop",
    "no-open-quote", "no-repeat", "none", "normal", "not-allowed", "nowrap",
    "ns-resize", "numbers", "numeric", "nw-resize", "nwse-resize", "oblique", "octal", "opacity", "open-quote",
    "optimizeLegibility", "optimizeSpeed", "oriya", "oromo", "outset",
    "outside", "outside-shape", "overlay", "overline", "padding", "padding-box",
    "painted", "page", "paused", "persian", "perspective", "plus-darker", "plus-lighter",
    "pointer", "polygon", "portrait", "pre", "pre-line", "pre-wrap", "preserve-3d",
    "progress", "push-button", "radial-gradient", "radio", "read-only",
    "read-write", "read-write-plaintext-only", "rectangle", "region",
    "relative", "repeat", "repeating-linear-gradient",
    "repeating-radial-gradient", "repeat-x", "repeat-y", "reset", "reverse",
    "rgb", "rgba", "ridge", "right", "rotate", "rotate3d", "rotateX", "rotateY",
    "rotateZ", "round", "row", "row-resize", "row-reverse", "rtl", "run-in", "running",
    "s-resize", "sans-serif", "saturation", "scale", "scale3d", "scaleX", "scaleY", "scaleZ", "screen",
    "scroll", "scrollbar", "scroll-position", "se-resize", "searchfield",
    "searchfield-cancel-button", "searchfield-decoration",
    "searchfield-results-button", "searchfield-results-decoration", "self-start", "self-end",
    "semi-condensed", "semi-expanded", "separate", "serif", "show", "sidama",
    "simp-chinese-formal", "simp-chinese-informal", "single",
    "skew", "skewX", "skewY", "skip-white-space", "slide", "slider-horizontal",
    "slider-vertical", "sliderthumb-horizontal", "sliderthumb-vertical", "slow",
    "small", "small-caps", "small-caption", "smaller", "soft-light", "solid", "somali",
    "source-atop", "source-in", "source-out", "source-over", "space", "space-around", "space-between", "space-evenly", "spell-out", "square",
    "square-button", "start", "static", "status-bar", "stretch", "stroke", "sub",
    "subpixel-antialiased", "super", "sw-resize", "symbolic", "symbols", "system-ui", "table",
    "table-caption", "table-cell", "table-column", "table-column-group",
    "table-footer-group", "table-header-group", "table-row", "table-row-group",
    "tamil",
    "telugu", "text", "text-bottom", "text-top", "textarea", "textfield", "thai",
    "thick", "thin", "threeddarkshadow", "threedface", "threedhighlight",
    "threedlightshadow", "threedshadow", "tibetan", "tigre", "tigrinya-er",
    "tigrinya-er-abegede", "tigrinya-et", "tigrinya-et-abegede", "to", "top",
    "trad-chinese-formal", "trad-chinese-informal", "transform",
    "translate", "translate3d", "translateX", "translateY", "translateZ",
    "transparent", "ultra-condensed", "ultra-expanded", "underline", "unset", "up",
    "upper-alpha", "upper-armenian", "upper-greek", "upper-hexadecimal",
    "upper-latin", "upper-norwegian", "upper-roman", "uppercase", "urdu", "url",
    "var", "vertical", "vertical-text", "visible", "visibleFill", "visiblePainted",
    "visibleStroke", "visual", "w-resize", "wait", "wave", "wider",
    "window", "windowframe", "windowtext", "words", "wrap", "wrap-reverse", "x-large", "x-small", "xor",
    "xx-large", "xx-small"
  ], valueKeywords = keySet(valueKeywords_);

  var allWords = documentTypes_.concat(mediaTypes_).concat(mediaFeatures_).concat(mediaValueKeywords_)
    .concat(propertyKeywords_).concat(nonStandardPropertyKeywords_).concat(colorKeywords_)
    .concat(valueKeywords_);
  CodeMirror.registerHelper("hintWords", "css", allWords);

  function tokenCComment(stream, state) {
    var maybeEnd = false, ch;
    while ((ch = stream.next()) != null) {
      if (maybeEnd && ch == "/") {
        state.tokenize = null;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return ["comment", "comment"];
  }

  CodeMirror.defineMIME("text/css", {
    documentTypes: documentTypes,
    mediaTypes: mediaTypes,
    mediaFeatures: mediaFeatures,
    mediaValueKeywords: mediaValueKeywords,
    propertyKeywords: propertyKeywords,
    nonStandardPropertyKeywords: nonStandardPropertyKeywords,
    fontProperties: fontProperties,
    counterDescriptors: counterDescriptors,
    colorKeywords: colorKeywords,
    valueKeywords: valueKeywords,
    tokenHooks: {
      "/": function(stream, state) {
        if (!stream.eat("*")) return false;
        state.tokenize = tokenCComment;
        return tokenCComment(stream, state);
      }
    },
    name: "css"
  });

  CodeMirror.defineMIME("text/x-scss", {
    mediaTypes: mediaTypes,
    mediaFeatures: mediaFeatures,
    mediaValueKeywords: mediaValueKeywords,
    propertyKeywords: propertyKeywords,
    nonStandardPropertyKeywords: nonStandardPropertyKeywords,
    colorKeywords: colorKeywords,
    valueKeywords: valueKeywords,
    fontProperties: fontProperties,
    allowNested: true,
    lineComment: "//",
    tokenHooks: {
      "/": function(stream, state) {
        if (stream.eat("/")) {
          stream.skipToEnd();
          return ["comment", "comment"];
        } else if (stream.eat("*")) {
          state.tokenize = tokenCComment;
          return tokenCComment(stream, state);
        } else {
          return ["operator", "operator"];
        }
      },
      ":": function(stream) {
        if (stream.match(/\s*\{/, false))
          return [null, null]
        return false;
      },
      "$": function(stream) {
        stream.match(/^[\w-]+/);
        if (stream.match(/^\s*:/, false))
          return ["variable-2", "variable-definition"];
        return ["variable-2", "variable"];
      },
      "#": function(stream) {
        if (!stream.eat("{")) return false;
        return [null, "interpolation"];
      }
    },
    name: "css",
    helperType: "scss"
  });

  CodeMirror.defineMIME("text/x-less", {
    mediaTypes: mediaTypes,
    mediaFeatures: mediaFeatures,
    mediaValueKeywords: mediaValueKeywords,
    propertyKeywords: propertyKeywords,
    nonStandardPropertyKeywords: nonStandardPropertyKeywords,
    colorKeywords: colorKeywords,
    valueKeywords: valueKeywords,
    fontProperties: fontProperties,
    allowNested: true,
    lineComment: "//",
    tokenHooks: {
      "/": function(stream, state) {
        if (stream.eat("/")) {
          stream.skipToEnd();
          return ["comment", "comment"];
        } else if (stream.eat("*")) {
          state.tokenize = tokenCComment;
          return tokenCComment(stream, state);
        } else {
          return ["operator", "operator"];
        }
      },
      "@": function(stream) {
        if (stream.eat("{")) return [null, "interpolation"];
        if (stream.match(/^(charset|document|font-face|import|(-(moz|ms|o|webkit)-)?keyframes|media|namespace|page|supports)\b/i, false)) return false;
        stream.eatWhile(/[\w\\\-]/);
        if (stream.match(/^\s*:/, false))
          return ["variable-2", "variable-definition"];
        return ["variable-2", "variable"];
      },
      "&": function() {
        return ["atom", "atom"];
      }
    },
    name: "css",
    helperType: "less"
  });

  CodeMirror.defineMIME("text/x-gss", {
    documentTypes: documentTypes,
    mediaTypes: mediaTypes,
    mediaFeatures: mediaFeatures,
    propertyKeywords: propertyKeywords,
    nonStandardPropertyKeywords: nonStandardPropertyKeywords,
    fontProperties: fontProperties,
    counterDescriptors: counterDescriptors,
    colorKeywords: colorKeywords,
    valueKeywords: valueKeywords,
    supportsAtComponent: true,
    tokenHooks: {
      "/": function(stream, state) {
        if (!stream.eat("*")) return false;
        state.tokenize = tokenCComment;
        return tokenCComment(stream, state);
      }
    },
    name: "css",
    helperType: "gss"
  });

});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/mode/javascript/javascript',["../../CodeMirror"], function(CodeMirror) {
"use strict";

CodeMirror.defineMode("javascript", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  var statementIndent = parserConfig.statementIndent;
  var jsonldMode = parserConfig.jsonld;
  var jsonMode = parserConfig.json || jsonldMode;
  var isTS = parserConfig.typescript;
  var wordRE = parserConfig.wordCharacters || /[\w$\xa1-\uffff]/;

  // Tokenizer

  var keywords = function(){
    function kw(type) {return {type: type, style: "keyword"};}
    var A = kw("keyword a"), B = kw("keyword b"), C = kw("keyword c"), D = kw("keyword d");
    var operator = kw("operator"), atom = {type: "atom", style: "atom"};

    return {
      "if": kw("if"), "while": A, "with": A, "else": B, "do": B, "try": B, "finally": B,
      "return": D, "break": D, "continue": D, "new": kw("new"), "delete": C, "void": C, "throw": C,
      "debugger": kw("debugger"), "var": kw("var"), "const": kw("var"), "let": kw("var"),
      "function": kw("function"), "catch": kw("catch"),
      "for": kw("for"), "switch": kw("switch"), "case": kw("case"), "default": kw("default"),
      "in": operator, "typeof": operator, "instanceof": operator,
      "true": atom, "false": atom, "null": atom, "undefined": atom, "NaN": atom, "Infinity": atom,
      "this": kw("this"), "class": kw("class"), "super": kw("atom"),
      "yield": C, "export": kw("export"), "import": kw("import"), "extends": C,
      "await": C
    };
  }();

  var isOperatorChar = /[+\-*&%=<>!?|~^@]/;
  var isJsonldKeyword = /^@(context|id|value|language|type|container|list|set|reverse|index|base|vocab|graph)"/;

  function readRegexp(stream) {
    var escaped = false, next, inSet = false;
    while ((next = stream.next()) != null) {
      if (!escaped) {
        if (next == "/" && !inSet) return;
        if (next == "[") inSet = true;
        else if (inSet && next == "]") inSet = false;
      }
      escaped = !escaped && next == "\\";
    }
  }

  // Used as scratch variables to communicate multiple values without
  // consing up tons of objects.
  var type, content;
  function ret(tp, style, cont) {
    type = tp; content = cont;
    return style;
  }
  function tokenBase(stream, state) {
    var ch = stream.next();
    if (ch == '"' || ch == "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    } else if (ch == "." && stream.match(/^\d+(?:[eE][+\-]?\d+)?/)) {
      return ret("number", "number");
    } else if (ch == "." && stream.match("..")) {
      return ret("spread", "meta");
    } else if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
      return ret(ch);
    } else if (ch == "=" && stream.eat(">")) {
      return ret("=>", "operator");
    } else if (ch == "0" && stream.match(/^(?:x[\da-f]+|o[0-7]+|b[01]+)n?/i)) {
      return ret("number", "number");
    } else if (/\d/.test(ch)) {
      stream.match(/^\d*(?:n|(?:\.\d*)?(?:[eE][+\-]?\d+)?)?/);
      return ret("number", "number");
    } else if (ch == "/") {
      if (stream.eat("*")) {
        state.tokenize = tokenComment;
        return tokenComment(stream, state);
      } else if (stream.eat("/")) {
        stream.skipToEnd();
        return ret("comment", "comment");
      } else if (expressionAllowed(stream, state, 1)) {
        readRegexp(stream);
        stream.match(/^\b(([gimyus])(?![gimyus]*\2))+\b/);
        return ret("regexp", "string-2");
      } else {
        stream.eat("=");
        return ret("operator", "operator", stream.current());
      }
    } else if (ch == "`") {
      state.tokenize = tokenQuasi;
      return tokenQuasi(stream, state);
    } else if (ch == "#") {
      stream.skipToEnd();
      return ret("error", "error");
    } else if (isOperatorChar.test(ch)) {
      if (ch != ">" || !state.lexical || state.lexical.type != ">") {
        if (stream.eat("=")) {
          if (ch == "!" || ch == "=") stream.eat("=")
        } else if (/[<>*+\-]/.test(ch)) {
          stream.eat(ch)
          if (ch == ">") stream.eat(ch)
        }
      }
      return ret("operator", "operator", stream.current());
    } else if (wordRE.test(ch)) {
      stream.eatWhile(wordRE);
      var word = stream.current()
      if (state.lastType != ".") {
        if (keywords.propertyIsEnumerable(word)) {
          var kw = keywords[word]
          return ret(kw.type, kw.style, word)
        }
        if (word == "async" && stream.match(/^(\s|\/\*.*?\*\/)*[\[\(\w]/, false))
          return ret("async", "keyword", word)
      }
      return ret("variable", "variable", word)
    }
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, next;
      if (jsonldMode && stream.peek() == "@" && stream.match(isJsonldKeyword)){
        state.tokenize = tokenBase;
        return ret("jsonld-keyword", "meta");
      }
      while ((next = stream.next()) != null) {
        if (next == quote && !escaped) break;
        escaped = !escaped && next == "\\";
      }
      if (!escaped) state.tokenize = tokenBase;
      return ret("string", "string");
    };
  }

  function tokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == "/" && maybeEnd) {
        state.tokenize = tokenBase;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return ret("comment", "comment");
  }

  function tokenQuasi(stream, state) {
    var escaped = false, next;
    while ((next = stream.next()) != null) {
      if (!escaped && (next == "`" || next == "$" && stream.eat("{"))) {
        state.tokenize = tokenBase;
        break;
      }
      escaped = !escaped && next == "\\";
    }
    return ret("quasi", "string-2", stream.current());
  }

  var brackets = "([{}])";
  // This is a crude lookahead trick to try and notice that we're
  // parsing the argument patterns for a fat-arrow function before we
  // actually hit the arrow token. It only works if the arrow is on
  // the same line as the arguments and there's no strange noise
  // (comments) in between. Fallback is to only notice when we hit the
  // arrow, and not declare the arguments as locals for the arrow
  // body.
  function findFatArrow(stream, state) {
    if (state.fatArrowAt) state.fatArrowAt = null;
    var arrow = stream.string.indexOf("=>", stream.start);
    if (arrow < 0) return;

    if (isTS) { // Try to skip TypeScript return type declarations after the arguments
      var m = /:\s*(?:\w+(?:<[^>]*>|\[\])?|\{[^}]*\})\s*$/.exec(stream.string.slice(stream.start, arrow))
      if (m) arrow = m.index
    }

    var depth = 0, sawSomething = false;
    for (var pos = arrow - 1; pos >= 0; --pos) {
      var ch = stream.string.charAt(pos);
      var bracket = brackets.indexOf(ch);
      if (bracket >= 0 && bracket < 3) {
        if (!depth) { ++pos; break; }
        if (--depth == 0) { if (ch == "(") sawSomething = true; break; }
      } else if (bracket >= 3 && bracket < 6) {
        ++depth;
      } else if (wordRE.test(ch)) {
        sawSomething = true;
      } else if (/["'\/]/.test(ch)) {
        return;
      } else if (sawSomething && !depth) {
        ++pos;
        break;
      }
    }
    if (sawSomething && !depth) state.fatArrowAt = pos;
  }

  // Parser

  var atomicTypes = {"atom": true, "number": true, "variable": true, "string": true, "regexp": true, "this": true, "jsonld-keyword": true};

  function JSLexical(indented, column, type, align, prev, info) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.prev = prev;
    this.info = info;
    if (align != null) this.align = align;
  }

  function inScope(state, varname) {
    for (var v = state.localVars; v; v = v.next)
      if (v.name == varname) return true;
    for (var cx = state.context; cx; cx = cx.prev) {
      for (var v = cx.vars; v; v = v.next)
        if (v.name == varname) return true;
    }
  }

  function parseJS(state, style, type, content, stream) {
    var cc = state.cc;
    // Communicate our context to the combinators.
    // (Less wasteful than consing up a hundred closures on every call.)
    cx.state = state; cx.stream = stream; cx.marked = null, cx.cc = cc; cx.style = style;

    if (!state.lexical.hasOwnProperty("align"))
      state.lexical.align = true;

    while(true) {
      var combinator = cc.length ? cc.pop() : jsonMode ? expression : statement;
      if (combinator(type, content)) {
        while(cc.length && cc[cc.length - 1].lex)
          cc.pop()();
        if (cx.marked) return cx.marked;
        if (type == "variable" && inScope(state, content)) return "variable-2";
        return style;
      }
    }
  }

  // Combinator utils

  var cx = {state: null, column: null, marked: null, cc: null};
  function pass() {
    for (var i = arguments.length - 1; i >= 0; i--) cx.cc.push(arguments[i]);
  }
  function cont() {
    pass.apply(null, arguments);
    return true;
  }
  function inList(name, list) {
    for (var v = list; v; v = v.next) if (v.name == name) return true
    return false;
  }
  function register(varname) {
    var state = cx.state;
    cx.marked = "def";
    if (state.context) {
      if (state.lexical.info == "var" && state.context && state.context.block) {
        // FIXME function decls are also not block scoped
        var newContext = registerVarScoped(varname, state.context)
        if (newContext != null) {
          state.context = newContext
          return
        }
      } else if (!inList(varname, state.localVars)) {
        state.localVars = new Var(varname, state.localVars)
        return
      }
    }
    // Fall through means this is global
    if (parserConfig.globalVars && !inList(varname, state.globalVars))
      state.globalVars = new Var(varname, state.globalVars)
  }
  function registerVarScoped(varname, context) {
    if (!context) {
      return null
    } else if (context.block) {
      var inner = registerVarScoped(varname, context.prev)
      if (!inner) return null
      if (inner == context.prev) return context
      return new Context(inner, context.vars, true)
    } else if (inList(varname, context.vars)) {
      return context
    } else {
      return new Context(context.prev, new Var(varname, context.vars), false)
    }
  }

  function isModifier(name) {
    return name == "public" || name == "private" || name == "protected" || name == "abstract" || name == "readonly"
  }

  // Combinators

  function Context(prev, vars, block) { this.prev = prev; this.vars = vars; this.block = block }
  function Var(name, next) { this.name = name; this.next = next }

  var defaultVars = new Var("this", new Var("arguments", null))
  function pushcontext() {
    cx.state.context = new Context(cx.state.context, cx.state.localVars, false)
    cx.state.localVars = defaultVars
  }
  function pushblockcontext() {
    cx.state.context = new Context(cx.state.context, cx.state.localVars, true)
    cx.state.localVars = null
  }
  function popcontext() {
    cx.state.localVars = cx.state.context.vars
    cx.state.context = cx.state.context.prev
  }
  popcontext.lex = true
  function pushlex(type, info) {
    var result = function() {
      var state = cx.state, indent = state.indented;
      if (state.lexical.type == "stat") indent = state.lexical.indented;
      else for (var outer = state.lexical; outer && outer.type == ")" && outer.align; outer = outer.prev)
        indent = outer.indented;
      state.lexical = new JSLexical(indent, cx.stream.column(), type, null, state.lexical, info);
    };
    result.lex = true;
    return result;
  }
  function poplex() {
    var state = cx.state;
    if (state.lexical.prev) {
      if (state.lexical.type == ")")
        state.indented = state.lexical.indented;
      state.lexical = state.lexical.prev;
    }
  }
  poplex.lex = true;

  function expect(wanted) {
    function exp(type) {
      if (type == wanted) return cont();
      else if (wanted == ";" || type == "}" || type == ")" || type == "]") return pass();
      else return cont(exp);
    };
    return exp;
  }

  function statement(type, value) {
    if (type == "var") return cont(pushlex("vardef", value), vardef, expect(";"), poplex);
    if (type == "keyword a") return cont(pushlex("form"), parenExpr, statement, poplex);
    if (type == "keyword b") return cont(pushlex("form"), statement, poplex);
    if (type == "keyword d") return cx.stream.match(/^\s*$/, false) ? cont() : cont(pushlex("stat"), maybeexpression, expect(";"), poplex);
    if (type == "debugger") return cont(expect(";"));
    if (type == "{") return cont(pushlex("}"), pushblockcontext, block, poplex, popcontext);
    if (type == ";") return cont();
    if (type == "if") {
      if (cx.state.lexical.info == "else" && cx.state.cc[cx.state.cc.length - 1] == poplex)
        cx.state.cc.pop()();
      return cont(pushlex("form"), parenExpr, statement, poplex, maybeelse);
    }
    if (type == "function") return cont(functiondef);
    if (type == "for") return cont(pushlex("form"), forspec, statement, poplex);
    if (type == "class" || (isTS && value == "interface")) {
      cx.marked = "keyword"
      return cont(pushlex("form", type == "class" ? type : value), className, poplex)
    }
    if (type == "variable") {
      if (isTS && value == "declare") {
        cx.marked = "keyword"
        return cont(statement)
      } else if (isTS && (value == "module" || value == "enum" || value == "type") && cx.stream.match(/^\s*\w/, false)) {
        cx.marked = "keyword"
        if (value == "enum") return cont(enumdef);
        else if (value == "type") return cont(typename, expect("operator"), typeexpr, expect(";"));
        else return cont(pushlex("form"), pattern, expect("{"), pushlex("}"), block, poplex, poplex)
      } else if (isTS && value == "namespace") {
        cx.marked = "keyword"
        return cont(pushlex("form"), expression, statement, poplex)
      } else if (isTS && value == "abstract") {
        cx.marked = "keyword"
        return cont(statement)
      } else {
        return cont(pushlex("stat"), maybelabel);
      }
    }
    if (type == "switch") return cont(pushlex("form"), parenExpr, expect("{"), pushlex("}", "switch"), pushblockcontext,
                                      block, poplex, poplex, popcontext);
    if (type == "case") return cont(expression, expect(":"));
    if (type == "default") return cont(expect(":"));
    if (type == "catch") return cont(pushlex("form"), pushcontext, maybeCatchBinding, statement, poplex, popcontext);
    if (type == "export") return cont(pushlex("stat"), afterExport, poplex);
    if (type == "import") return cont(pushlex("stat"), afterImport, poplex);
    if (type == "async") return cont(statement)
    if (value == "@") return cont(expression, statement)
    return pass(pushlex("stat"), expression, expect(";"), poplex);
  }
  function maybeCatchBinding(type) {
    if (type == "(") return cont(funarg, expect(")"))
  }
  function expression(type, value) {
    return expressionInner(type, value, false);
  }
  function expressionNoComma(type, value) {
    return expressionInner(type, value, true);
  }
  function parenExpr(type) {
    if (type != "(") return pass()
    return cont(pushlex(")"), expression, expect(")"), poplex)
  }
  function expressionInner(type, value, noComma) {
    if (cx.state.fatArrowAt == cx.stream.start) {
      var body = noComma ? arrowBodyNoComma : arrowBody;
      if (type == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, expect("=>"), body, popcontext);
      else if (type == "variable") return pass(pushcontext, pattern, expect("=>"), body, popcontext);
    }

    var maybeop = noComma ? maybeoperatorNoComma : maybeoperatorComma;
    if (atomicTypes.hasOwnProperty(type)) return cont(maybeop);
    if (type == "function") return cont(functiondef, maybeop);
    if (type == "class" || (isTS && value == "interface")) { cx.marked = "keyword"; return cont(pushlex("form"), classExpression, poplex); }
    if (type == "keyword c" || type == "async") return cont(noComma ? expressionNoComma : expression);
    if (type == "(") return cont(pushlex(")"), maybeexpression, expect(")"), poplex, maybeop);
    if (type == "operator" || type == "spread") return cont(noComma ? expressionNoComma : expression);
    if (type == "[") return cont(pushlex("]"), arrayLiteral, poplex, maybeop);
    if (type == "{") return contCommasep(objprop, "}", null, maybeop);
    if (type == "quasi") return pass(quasi, maybeop);
    if (type == "new") return cont(maybeTarget(noComma));
    if (type == "import") return cont(expression);
    return cont();
  }
  function maybeexpression(type) {
    if (type.match(/[;\}\)\],]/)) return pass();
    return pass(expression);
  }

  function maybeoperatorComma(type, value) {
    if (type == ",") return cont(expression);
    return maybeoperatorNoComma(type, value, false);
  }
  function maybeoperatorNoComma(type, value, noComma) {
    var me = noComma == false ? maybeoperatorComma : maybeoperatorNoComma;
    var expr = noComma == false ? expression : expressionNoComma;
    if (type == "=>") return cont(pushcontext, noComma ? arrowBodyNoComma : arrowBody, popcontext);
    if (type == "operator") {
      if (/\+\+|--/.test(value) || isTS && value == "!") return cont(me);
      if (isTS && value == "<" && cx.stream.match(/^([^>]|<.*?>)*>\s*\(/, false))
        return cont(pushlex(">"), commasep(typeexpr, ">"), poplex, me);
      if (value == "?") return cont(expression, expect(":"), expr);
      return cont(expr);
    }
    if (type == "quasi") { return pass(quasi, me); }
    if (type == ";") return;
    if (type == "(") return contCommasep(expressionNoComma, ")", "call", me);
    if (type == ".") return cont(property, me);
    if (type == "[") return cont(pushlex("]"), maybeexpression, expect("]"), poplex, me);
    if (isTS && value == "as") { cx.marked = "keyword"; return cont(typeexpr, me) }
    if (type == "regexp") {
      cx.state.lastType = cx.marked = "operator"
      cx.stream.backUp(cx.stream.pos - cx.stream.start - 1)
      return cont(expr)
    }
  }
  function quasi(type, value) {
    if (type != "quasi") return pass();
    if (value.slice(value.length - 2) != "${") return cont(quasi);
    return cont(expression, continueQuasi);
  }
  function continueQuasi(type) {
    if (type == "}") {
      cx.marked = "string-2";
      cx.state.tokenize = tokenQuasi;
      return cont(quasi);
    }
  }
  function arrowBody(type) {
    findFatArrow(cx.stream, cx.state);
    return pass(type == "{" ? statement : expression);
  }
  function arrowBodyNoComma(type) {
    findFatArrow(cx.stream, cx.state);
    return pass(type == "{" ? statement : expressionNoComma);
  }
  function maybeTarget(noComma) {
    return function(type) {
      if (type == ".") return cont(noComma ? targetNoComma : target);
      else if (type == "variable" && isTS) return cont(maybeTypeArgs, noComma ? maybeoperatorNoComma : maybeoperatorComma)
      else return pass(noComma ? expressionNoComma : expression);
    };
  }
  function target(_, value) {
    if (value == "target") { cx.marked = "keyword"; return cont(maybeoperatorComma); }
  }
  function targetNoComma(_, value) {
    if (value == "target") { cx.marked = "keyword"; return cont(maybeoperatorNoComma); }
  }
  function maybelabel(type) {
    if (type == ":") return cont(poplex, statement);
    return pass(maybeoperatorComma, expect(";"), poplex);
  }
  function property(type) {
    if (type == "variable") {cx.marked = "property"; return cont();}
  }
  function objprop(type, value) {
    if (type == "async") {
      cx.marked = "property";
      return cont(objprop);
    } else if (type == "variable" || cx.style == "keyword") {
      cx.marked = "property";
      if (value == "get" || value == "set") return cont(getterSetter);
      var m // Work around fat-arrow-detection complication for detecting typescript typed arrow params
      if (isTS && cx.state.fatArrowAt == cx.stream.start && (m = cx.stream.match(/^\s*:\s*/, false)))
        cx.state.fatArrowAt = cx.stream.pos + m[0].length
      return cont(afterprop);
    } else if (type == "number" || type == "string") {
      cx.marked = jsonldMode ? "property" : (cx.style + " property");
      return cont(afterprop);
    } else if (type == "jsonld-keyword") {
      return cont(afterprop);
    } else if (isTS && isModifier(value)) {
      cx.marked = "keyword"
      return cont(objprop)
    } else if (type == "[") {
      return cont(expression, maybetype, expect("]"), afterprop);
    } else if (type == "spread") {
      return cont(expressionNoComma, afterprop);
    } else if (value == "*") {
      cx.marked = "keyword";
      return cont(objprop);
    } else if (type == ":") {
      return pass(afterprop)
    }
  }
  function getterSetter(type) {
    if (type != "variable") return pass(afterprop);
    cx.marked = "property";
    return cont(functiondef);
  }
  function afterprop(type) {
    if (type == ":") return cont(expressionNoComma);
    if (type == "(") return pass(functiondef);
  }
  function commasep(what, end, sep) {
    function proceed(type, value) {
      if (sep ? sep.indexOf(type) > -1 : type == ",") {
        var lex = cx.state.lexical;
        if (lex.info == "call") lex.pos = (lex.pos || 0) + 1;
        return cont(function(type, value) {
          if (type == end || value == end) return pass()
          return pass(what)
        }, proceed);
      }
      if (type == end || value == end) return cont();
      if (sep && sep.indexOf(";") > -1) return pass(what)
      return cont(expect(end));
    }
    return function(type, value) {
      if (type == end || value == end) return cont();
      return pass(what, proceed);
    };
  }
  function contCommasep(what, end, info) {
    for (var i = 3; i < arguments.length; i++)
      cx.cc.push(arguments[i]);
    return cont(pushlex(end, info), commasep(what, end), poplex);
  }
  function block(type) {
    if (type == "}") return cont();
    return pass(statement, block);
  }
  function maybetype(type, value) {
    if (isTS) {
      if (type == ":" || value == "in") return cont(typeexpr);
      if (value == "?") return cont(maybetype);
    }
  }
  function mayberettype(type) {
    if (isTS && type == ":") {
      if (cx.stream.match(/^\s*\w+\s+is\b/, false)) return cont(expression, isKW, typeexpr)
      else return cont(typeexpr)
    }
  }
  function isKW(_, value) {
    if (value == "is") {
      cx.marked = "keyword"
      return cont()
    }
  }
  function typeexpr(type, value) {
    if (value == "keyof" || value == "typeof" || value == "infer") {
      cx.marked = "keyword"
      return cont(value == "typeof" ? expressionNoComma : typeexpr)
    }
    if (type == "variable" || value == "void") {
      cx.marked = "type"
      return cont(afterType)
    }
    if (value == "|" || value == "&") return cont(typeexpr)
    if (type == "string" || type == "number" || type == "atom") return cont(afterType);
    if (type == "[") return cont(pushlex("]"), commasep(typeexpr, "]", ","), poplex, afterType)
    if (type == "{") return cont(pushlex("}"), commasep(typeprop, "}", ",;"), poplex, afterType)
    if (type == "(") return cont(commasep(typearg, ")"), maybeReturnType, afterType)
    if (type == "<") return cont(commasep(typeexpr, ">"), typeexpr)
  }
  function maybeReturnType(type) {
    if (type == "=>") return cont(typeexpr)
  }
  function typeprop(type, value) {
    if (type == "variable" || cx.style == "keyword") {
      cx.marked = "property"
      return cont(typeprop)
    } else if (value == "?" || type == "number" || type == "string") {
      return cont(typeprop)
    } else if (type == ":") {
      return cont(typeexpr)
    } else if (type == "[") {
      return cont(expect("variable"), maybetype, expect("]"), typeprop)
    } else if (type == "(") {
      return pass(functiondecl, typeprop)
    }
  }
  function typearg(type, value) {
    if (type == "variable" && cx.stream.match(/^\s*[?:]/, false) || value == "?") return cont(typearg)
    if (type == ":") return cont(typeexpr)
    if (type == "spread") return cont(typearg)
    return pass(typeexpr)
  }
  function afterType(type, value) {
    if (value == "<") return cont(pushlex(">"), commasep(typeexpr, ">"), poplex, afterType)
    if (value == "|" || type == "." || value == "&") return cont(typeexpr)
    if (type == "[") return cont(typeexpr, expect("]"), afterType)
    if (value == "extends" || value == "implements") { cx.marked = "keyword"; return cont(typeexpr) }
    if (value == "?") return cont(typeexpr, expect(":"), typeexpr)
  }
  function maybeTypeArgs(_, value) {
    if (value == "<") return cont(pushlex(">"), commasep(typeexpr, ">"), poplex, afterType)
  }
  function typeparam() {
    return pass(typeexpr, maybeTypeDefault)
  }
  function maybeTypeDefault(_, value) {
    if (value == "=") return cont(typeexpr)
  }
  function vardef(_, value) {
    if (value == "enum") {cx.marked = "keyword"; return cont(enumdef)}
    return pass(pattern, maybetype, maybeAssign, vardefCont);
  }
  function pattern(type, value) {
    if (isTS && isModifier(value)) { cx.marked = "keyword"; return cont(pattern) }
    if (type == "variable") { register(value); return cont(); }
    if (type == "spread") return cont(pattern);
    if (type == "[") return contCommasep(eltpattern, "]");
    if (type == "{") return contCommasep(proppattern, "}");
  }
  function proppattern(type, value) {
    if (type == "variable" && !cx.stream.match(/^\s*:/, false)) {
      register(value);
      return cont(maybeAssign);
    }
    if (type == "variable") cx.marked = "property";
    if (type == "spread") return cont(pattern);
    if (type == "}") return pass();
    if (type == "[") return cont(expression, expect(']'), expect(':'), proppattern);
    return cont(expect(":"), pattern, maybeAssign);
  }
  function eltpattern() {
    return pass(pattern, maybeAssign)
  }
  function maybeAssign(_type, value) {
    if (value == "=") return cont(expressionNoComma);
  }
  function vardefCont(type) {
    if (type == ",") return cont(vardef);
  }
  function maybeelse(type, value) {
    if (type == "keyword b" && value == "else") return cont(pushlex("form", "else"), statement, poplex);
  }
  function forspec(type, value) {
    if (value == "await") return cont(forspec);
    if (type == "(") return cont(pushlex(")"), forspec1, poplex);
  }
  function forspec1(type) {
    if (type == "var") return cont(vardef, forspec2);
    if (type == "variable") return cont(forspec2);
    return pass(forspec2)
  }
  function forspec2(type, value) {
    if (type == ")") return cont()
    if (type == ";") return cont(forspec2)
    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression, forspec2) }
    return pass(expression, forspec2)
  }
  function functiondef(type, value) {
    if (value == "*") {cx.marked = "keyword"; return cont(functiondef);}
    if (type == "variable") {register(value); return cont(functiondef);}
    if (type == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, mayberettype, statement, popcontext);
    if (isTS && value == "<") return cont(pushlex(">"), commasep(typeparam, ">"), poplex, functiondef)
  }
  function functiondecl(type, value) {
    if (value == "*") {cx.marked = "keyword"; return cont(functiondecl);}
    if (type == "variable") {register(value); return cont(functiondecl);}
    if (type == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, mayberettype, popcontext);
    if (isTS && value == "<") return cont(pushlex(">"), commasep(typeparam, ">"), poplex, functiondecl)
  }
  function typename(type, value) {
    if (type == "keyword" || type == "variable") {
      cx.marked = "type"
      return cont(typename)
    } else if (value == "<") {
      return cont(pushlex(">"), commasep(typeparam, ">"), poplex)
    }
  }
  function funarg(type, value) {
    if (value == "@") cont(expression, funarg)
    if (type == "spread") return cont(funarg);
    if (isTS && isModifier(value)) { cx.marked = "keyword"; return cont(funarg); }
    if (isTS && type == "this") return cont(maybetype, maybeAssign)
    return pass(pattern, maybetype, maybeAssign);
  }
  function classExpression(type, value) {
    // Class expressions may have an optional name.
    if (type == "variable") return className(type, value);
    return classNameAfter(type, value);
  }
  function className(type, value) {
    if (type == "variable") {register(value); return cont(classNameAfter);}
  }
  function classNameAfter(type, value) {
    if (value == "<") return cont(pushlex(">"), commasep(typeparam, ">"), poplex, classNameAfter)
    if (value == "extends" || value == "implements" || (isTS && type == ",")) {
      if (value == "implements") cx.marked = "keyword";
      return cont(isTS ? typeexpr : expression, classNameAfter);
    }
    if (type == "{") return cont(pushlex("}"), classBody, poplex);
  }
  function classBody(type, value) {
    if (type == "async" ||
        (type == "variable" &&
         (value == "static" || value == "get" || value == "set" || (isTS && isModifier(value))) &&
         cx.stream.match(/^\s+[\w$\xa1-\uffff]/, false))) {
      cx.marked = "keyword";
      return cont(classBody);
    }
    if (type == "variable" || cx.style == "keyword") {
      cx.marked = "property";
      return cont(isTS ? classfield : functiondef, classBody);
    }
    if (type == "number" || type == "string") return cont(isTS ? classfield : functiondef, classBody);
    if (type == "[")
      return cont(expression, maybetype, expect("]"), isTS ? classfield : functiondef, classBody)
    if (value == "*") {
      cx.marked = "keyword";
      return cont(classBody);
    }
    if (isTS && type == "(") return pass(functiondecl, classBody)
    if (type == ";" || type == ",") return cont(classBody);
    if (type == "}") return cont();
    if (value == "@") return cont(expression, classBody)
  }
  function classfield(type, value) {
    if (value == "?") return cont(classfield)
    if (type == ":") return cont(typeexpr, maybeAssign)
    if (value == "=") return cont(expressionNoComma)
    var context = cx.state.lexical.prev, isInterface = context && context.info == "interface"
    return pass(isInterface ? functiondecl : functiondef)
  }
  function afterExport(type, value) {
    if (value == "*") { cx.marked = "keyword"; return cont(maybeFrom, expect(";")); }
    if (value == "default") { cx.marked = "keyword"; return cont(expression, expect(";")); }
    if (type == "{") return cont(commasep(exportField, "}"), maybeFrom, expect(";"));
    return pass(statement);
  }
  function exportField(type, value) {
    if (value == "as") { cx.marked = "keyword"; return cont(expect("variable")); }
    if (type == "variable") return pass(expressionNoComma, exportField);
  }
  function afterImport(type) {
    if (type == "string") return cont();
    if (type == "(") return pass(expression);
    return pass(importSpec, maybeMoreImports, maybeFrom);
  }
  function importSpec(type, value) {
    if (type == "{") return contCommasep(importSpec, "}");
    if (type == "variable") register(value);
    if (value == "*") cx.marked = "keyword";
    return cont(maybeAs);
  }
  function maybeMoreImports(type) {
    if (type == ",") return cont(importSpec, maybeMoreImports)
  }
  function maybeAs(_type, value) {
    if (value == "as") { cx.marked = "keyword"; return cont(importSpec); }
  }
  function maybeFrom(_type, value) {
    if (value == "from") { cx.marked = "keyword"; return cont(expression); }
  }
  function arrayLiteral(type) {
    if (type == "]") return cont();
    return pass(commasep(expressionNoComma, "]"));
  }
  function enumdef() {
    return pass(pushlex("form"), pattern, expect("{"), pushlex("}"), commasep(enummember, "}"), poplex, poplex)
  }
  function enummember() {
    return pass(pattern, maybeAssign);
  }

  function isContinuedStatement(state, textAfter) {
    return state.lastType == "operator" || state.lastType == "," ||
      isOperatorChar.test(textAfter.charAt(0)) ||
      /[,.]/.test(textAfter.charAt(0));
  }

  function expressionAllowed(stream, state, backUp) {
    return state.tokenize == tokenBase &&
      /^(?:operator|sof|keyword [bcd]|case|new|export|default|spread|[\[{}\(,;:]|=>)$/.test(state.lastType) ||
      (state.lastType == "quasi" && /\{\s*$/.test(stream.string.slice(0, stream.pos - (backUp || 0))))
  }

  // Interface

  return {
    startState: function(basecolumn) {
      var state = {
        tokenize: tokenBase,
        lastType: "sof",
        cc: [],
        lexical: new JSLexical((basecolumn || 0) - indentUnit, 0, "block", false),
        localVars: parserConfig.localVars,
        context: parserConfig.localVars && new Context(null, null, false),
        indented: basecolumn || 0
      };
      if (parserConfig.globalVars && typeof parserConfig.globalVars == "object")
        state.globalVars = parserConfig.globalVars;
      return state;
    },

    token: function(stream, state) {
      if (stream.sol()) {
        if (!state.lexical.hasOwnProperty("align"))
          state.lexical.align = false;
        state.indented = stream.indentation();
        findFatArrow(stream, state);
      }
      if (state.tokenize != tokenComment && stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);
      if (type == "comment") return style;
      state.lastType = type == "operator" && (content == "++" || content == "--") ? "incdec" : type;
      return parseJS(state, style, type, content, stream);
    },

    indent: function(state, textAfter) {
      if (state.tokenize == tokenComment) return CodeMirror.Pass;
      if (state.tokenize != tokenBase) return 0;
      var firstChar = textAfter && textAfter.charAt(0), lexical = state.lexical, top
      // Kludge to prevent 'maybelse' from blocking lexical scope pops
      if (!/^\s*else\b/.test(textAfter)) for (var i = state.cc.length - 1; i >= 0; --i) {
        var c = state.cc[i];
        if (c == poplex) lexical = lexical.prev;
        else if (c != maybeelse) break;
      }
      while ((lexical.type == "stat" || lexical.type == "form") &&
             (firstChar == "}" || ((top = state.cc[state.cc.length - 1]) &&
                                   (top == maybeoperatorComma || top == maybeoperatorNoComma) &&
                                   !/^[,\.=+\-*:?[\(]/.test(textAfter))))
        lexical = lexical.prev;
      if (statementIndent && lexical.type == ")" && lexical.prev.type == "stat")
        lexical = lexical.prev;
      var type = lexical.type, closing = firstChar == type;

      if (type == "vardef") return lexical.indented + (state.lastType == "operator" || state.lastType == "," ? lexical.info.length + 1 : 0);
      else if (type == "form" && firstChar == "{") return lexical.indented;
      else if (type == "form") return lexical.indented + indentUnit;
      else if (type == "stat")
        return lexical.indented + (isContinuedStatement(state, textAfter) ? statementIndent || indentUnit : 0);
      else if (lexical.info == "switch" && !closing && parserConfig.doubleIndentSwitch != false)
        return lexical.indented + (/^(?:case|default)\b/.test(textAfter) ? indentUnit : 2 * indentUnit);
      else if (lexical.align) return lexical.column + (closing ? 0 : 1);
      else return lexical.indented + (closing ? 0 : indentUnit);
    },

    electricInput: /^\s*(?:case .*?:|default:|\{|\})$/,
    blockCommentStart: jsonMode ? null : "/*",
    blockCommentEnd: jsonMode ? null : "*/",
    blockCommentContinue: jsonMode ? null : " * ",
    lineComment: jsonMode ? null : "//",
    fold: "brace",
    closeBrackets: "()[]{}''\"\"``",

    helperType: jsonMode ? "json" : "javascript",
    jsonldMode: jsonldMode,
    jsonMode: jsonMode,

    expressionAllowed: expressionAllowed,

    skipExpression: function(state) {
      var top = state.cc[state.cc.length - 1]
      if (top == expression || top == expressionNoComma) state.cc.pop()
    }
  };
});

CodeMirror.registerHelper("wordChars", "javascript", /[\w$]/);

CodeMirror.defineMIME("text/javascript", "javascript");
CodeMirror.defineMIME("text/ecmascript", "javascript");
CodeMirror.defineMIME("application/javascript", "javascript");
CodeMirror.defineMIME("application/x-javascript", "javascript");
CodeMirror.defineMIME("application/ecmascript", "javascript");
CodeMirror.defineMIME("application/json", {name: "javascript", json: true});
CodeMirror.defineMIME("application/x-json", {name: "javascript", json: true});
CodeMirror.defineMIME("application/ld+json", {name: "javascript", jsonld: true});
CodeMirror.defineMIME("text/typescript", { name: "javascript", typescript: true });
CodeMirror.defineMIME("application/typescript", { name: "javascript", typescript: true });

});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE


define('skylark-codemirror/mode/htmlmixed/htmlmixed',[
  "../../CodeMirror",
  "../xml/xml",
  "../javascript/javascript",
  "../css/css"
], function(CodeMirror) {

  "use strict";

  var defaultTags = {
    script: [
      ["lang", /(javascript|babel)/i, "javascript"],
      ["type", /^(?:text|application)\/(?:x-)?(?:java|ecma)script$|^module$|^$/i, "javascript"],
      ["type", /./, "text/plain"],
      [null, null, "javascript"]
    ],
    style:  [
      ["lang", /^css$/i, "css"],
      ["type", /^(text\/)?(x-)?(stylesheet|css)$/i, "css"],
      ["type", /./, "text/plain"],
      [null, null, "css"]
    ]
  };

  function maybeBackup(stream, pat, style) {
    var cur = stream.current(), close = cur.search(pat);
    if (close > -1) {
      stream.backUp(cur.length - close);
    } else if (cur.match(/<\/?$/)) {
      stream.backUp(cur.length);
      if (!stream.match(pat, false)) stream.match(cur);
    }
    return style;
  }

  var attrRegexpCache = {};
  function getAttrRegexp(attr) {
    var regexp = attrRegexpCache[attr];
    if (regexp) return regexp;
    return attrRegexpCache[attr] = new RegExp("\\s+" + attr + "\\s*=\\s*('|\")?([^'\"]+)('|\")?\\s*");
  }

  function getAttrValue(text, attr) {
    var match = text.match(getAttrRegexp(attr))
    return match ? /^\s*(.*?)\s*$/.exec(match[2])[1] : ""
  }

  function getTagRegexp(tagName, anchored) {
    return new RegExp((anchored ? "^" : "") + "<\/\s*" + tagName + "\s*>", "i");
  }

  function addTags(from, to) {
    for (var tag in from) {
      var dest = to[tag] || (to[tag] = []);
      var source = from[tag];
      for (var i = source.length - 1; i >= 0; i--)
        dest.unshift(source[i])
    }
  }

  function findMatchingMode(tagInfo, tagText) {
    for (var i = 0; i < tagInfo.length; i++) {
      var spec = tagInfo[i];
      if (!spec[0] || spec[1].test(getAttrValue(tagText, spec[0]))) return spec[2];
    }
  }

  CodeMirror.defineMode("htmlmixed", function (config, parserConfig) {
    var htmlMode = CodeMirror.getMode(config, {
      name: "xml",
      htmlMode: true,
      multilineTagIndentFactor: parserConfig.multilineTagIndentFactor,
      multilineTagIndentPastTag: parserConfig.multilineTagIndentPastTag
    });

    var tags = {};
    var configTags = parserConfig && parserConfig.tags, configScript = parserConfig && parserConfig.scriptTypes;
    addTags(defaultTags, tags);
    if (configTags) addTags(configTags, tags);
    if (configScript) for (var i = configScript.length - 1; i >= 0; i--)
      tags.script.unshift(["type", configScript[i].matches, configScript[i].mode])

    function html(stream, state) {
      var style = htmlMode.token(stream, state.htmlState), tag = /\btag\b/.test(style), tagName
      if (tag && !/[<>\s\/]/.test(stream.current()) &&
          (tagName = state.htmlState.tagName && state.htmlState.tagName.toLowerCase()) &&
          tags.hasOwnProperty(tagName)) {
        state.inTag = tagName + " "
      } else if (state.inTag && tag && />$/.test(stream.current())) {
        var inTag = /^([\S]+) (.*)/.exec(state.inTag)
        state.inTag = null
        var modeSpec = stream.current() == ">" && findMatchingMode(tags[inTag[1]], inTag[2])
        var mode = CodeMirror.getMode(config, modeSpec)
        var endTagA = getTagRegexp(inTag[1], true), endTag = getTagRegexp(inTag[1], false);
        state.token = function (stream, state) {
          if (stream.match(endTagA, false)) {
            state.token = html;
            state.localState = state.localMode = null;
            return null;
          }
          return maybeBackup(stream, endTag, state.localMode.token(stream, state.localState));
        };
        state.localMode = mode;
        state.localState = CodeMirror.startState(mode, htmlMode.indent(state.htmlState, "", ""));
      } else if (state.inTag) {
        state.inTag += stream.current()
        if (stream.eol()) state.inTag += " "
      }
      return style;
    };

    return {
      startState: function () {
        var state = CodeMirror.startState(htmlMode);
        return {token: html, inTag: null, localMode: null, localState: null, htmlState: state};
      },

      copyState: function (state) {
        var local;
        if (state.localState) {
          local = CodeMirror.copyState(state.localMode, state.localState);
        }
        return {token: state.token, inTag: state.inTag,
                localMode: state.localMode, localState: local,
                htmlState: CodeMirror.copyState(htmlMode, state.htmlState)};
      },

      token: function (stream, state) {
        return state.token(stream, state);
      },

      indent: function (state, textAfter, line) {
        if (!state.localMode || /^\s*<\//.test(textAfter))
          return htmlMode.indent(state.htmlState, textAfter, line);
        else if (state.localMode.indent)
          return state.localMode.indent(state.localState, textAfter, line);
        else
          return CodeMirror.Pass;
      },

      innerMode: function (state) {
        return {state: state.localState || state.htmlState, mode: state.localMode || htmlMode};
      }
    };
  }, "xml", "javascript", "css");

  CodeMirror.defineMIME("text/html", "htmlmixed");
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/mode/meta',["../CodeMirror"], function(CodeMirror) {
  "use strict";

  CodeMirror.modeInfo = [
    {name: "APL", mime: "text/apl", mode: "apl", ext: ["dyalog", "apl"]},
    {name: "PGP", mimes: ["application/pgp", "application/pgp-encrypted", "application/pgp-keys", "application/pgp-signature"], mode: "asciiarmor", ext: ["asc", "pgp", "sig"]},
    {name: "ASN.1", mime: "text/x-ttcn-asn", mode: "asn.1", ext: ["asn", "asn1"]},
    {name: "Asterisk", mime: "text/x-asterisk", mode: "asterisk", file: /^extensions\.conf$/i},
    {name: "Brainfuck", mime: "text/x-brainfuck", mode: "brainfuck", ext: ["b", "bf"]},
    {name: "C", mime: "text/x-csrc", mode: "clike", ext: ["c", "h", "ino"]},
    {name: "C++", mime: "text/x-c++src", mode: "clike", ext: ["cpp", "c++", "cc", "cxx", "hpp", "h++", "hh", "hxx"], alias: ["cpp"]},
    {name: "Cobol", mime: "text/x-cobol", mode: "cobol", ext: ["cob", "cpy"]},
    {name: "C#", mime: "text/x-csharp", mode: "clike", ext: ["cs"], alias: ["csharp"]},
    {name: "Clojure", mime: "text/x-clojure", mode: "clojure", ext: ["clj", "cljc", "cljx"]},
    {name: "ClojureScript", mime: "text/x-clojurescript", mode: "clojure", ext: ["cljs"]},
    {name: "Closure Stylesheets (GSS)", mime: "text/x-gss", mode: "css", ext: ["gss"]},
    {name: "CMake", mime: "text/x-cmake", mode: "cmake", ext: ["cmake", "cmake.in"], file: /^CMakeLists.txt$/},
    {name: "CoffeeScript", mimes: ["application/vnd.coffeescript", "text/coffeescript", "text/x-coffeescript"], mode: "coffeescript", ext: ["coffee"], alias: ["coffee", "coffee-script"]},
    {name: "Common Lisp", mime: "text/x-common-lisp", mode: "commonlisp", ext: ["cl", "lisp", "el"], alias: ["lisp"]},
    {name: "Cypher", mime: "application/x-cypher-query", mode: "cypher", ext: ["cyp", "cypher"]},
    {name: "Cython", mime: "text/x-cython", mode: "python", ext: ["pyx", "pxd", "pxi"]},
    {name: "Crystal", mime: "text/x-crystal", mode: "crystal", ext: ["cr"]},
    {name: "CSS", mime: "text/css", mode: "css", ext: ["css"]},
    {name: "CQL", mime: "text/x-cassandra", mode: "sql", ext: ["cql"]},
    {name: "D", mime: "text/x-d", mode: "d", ext: ["d"]},
    {name: "Dart", mimes: ["application/dart", "text/x-dart"], mode: "dart", ext: ["dart"]},
    {name: "diff", mime: "text/x-diff", mode: "diff", ext: ["diff", "patch"]},
    {name: "Django", mime: "text/x-django", mode: "django"},
    {name: "Dockerfile", mime: "text/x-dockerfile", mode: "dockerfile", file: /^Dockerfile$/},
    {name: "DTD", mime: "application/xml-dtd", mode: "dtd", ext: ["dtd"]},
    {name: "Dylan", mime: "text/x-dylan", mode: "dylan", ext: ["dylan", "dyl", "intr"]},
    {name: "EBNF", mime: "text/x-ebnf", mode: "ebnf"},
    {name: "ECL", mime: "text/x-ecl", mode: "ecl", ext: ["ecl"]},
    {name: "edn", mime: "application/edn", mode: "clojure", ext: ["edn"]},
    {name: "Eiffel", mime: "text/x-eiffel", mode: "eiffel", ext: ["e"]},
    {name: "Elm", mime: "text/x-elm", mode: "elm", ext: ["elm"]},
    {name: "Embedded Javascript", mime: "application/x-ejs", mode: "htmlembedded", ext: ["ejs"]},
    {name: "Embedded Ruby", mime: "application/x-erb", mode: "htmlembedded", ext: ["erb"]},
    {name: "Erlang", mime: "text/x-erlang", mode: "erlang", ext: ["erl"]},
    {name: "Esper", mime: "text/x-esper", mode: "sql"},
    {name: "Factor", mime: "text/x-factor", mode: "factor", ext: ["factor"]},
    {name: "FCL", mime: "text/x-fcl", mode: "fcl"},
    {name: "Forth", mime: "text/x-forth", mode: "forth", ext: ["forth", "fth", "4th"]},
    {name: "Fortran", mime: "text/x-fortran", mode: "fortran", ext: ["f", "for", "f77", "f90", "f95"]},
    {name: "F#", mime: "text/x-fsharp", mode: "mllike", ext: ["fs"], alias: ["fsharp"]},
    {name: "Gas", mime: "text/x-gas", mode: "gas", ext: ["s"]},
    {name: "Gherkin", mime: "text/x-feature", mode: "gherkin", ext: ["feature"]},
    {name: "GitHub Flavored Markdown", mime: "text/x-gfm", mode: "gfm", file: /^(readme|contributing|history).md$/i},
    {name: "Go", mime: "text/x-go", mode: "go", ext: ["go"]},
    {name: "Groovy", mime: "text/x-groovy", mode: "groovy", ext: ["groovy", "gradle"], file: /^Jenkinsfile$/},
    {name: "HAML", mime: "text/x-haml", mode: "haml", ext: ["haml"]},
    {name: "Haskell", mime: "text/x-haskell", mode: "haskell", ext: ["hs"]},
    {name: "Haskell (Literate)", mime: "text/x-literate-haskell", mode: "haskell-literate", ext: ["lhs"]},
    {name: "Haxe", mime: "text/x-haxe", mode: "haxe", ext: ["hx"]},
    {name: "HXML", mime: "text/x-hxml", mode: "haxe", ext: ["hxml"]},
    {name: "ASP.NET", mime: "application/x-aspx", mode: "htmlembedded", ext: ["aspx"], alias: ["asp", "aspx"]},
    {name: "HTML", mime: "text/html", mode: "htmlmixed", ext: ["html", "htm", "handlebars", "hbs"], alias: ["xhtml"]},
    {name: "HTTP", mime: "message/http", mode: "http"},
    {name: "IDL", mime: "text/x-idl", mode: "idl", ext: ["pro"]},
    {name: "Pug", mime: "text/x-pug", mode: "pug", ext: ["jade", "pug"], alias: ["jade"]},
    {name: "Java", mime: "text/x-java", mode: "clike", ext: ["java"]},
    {name: "Java Server Pages", mime: "application/x-jsp", mode: "htmlembedded", ext: ["jsp"], alias: ["jsp"]},
    {name: "JavaScript", mimes: ["text/javascript", "text/ecmascript", "application/javascript", "application/x-javascript", "application/ecmascript"],
     mode: "javascript", ext: ["js"], alias: ["ecmascript", "js", "node"]},
    {name: "JSON", mimes: ["application/json", "application/x-json"], mode: "javascript", ext: ["json", "map"], alias: ["json5"]},
    {name: "JSON-LD", mime: "application/ld+json", mode: "javascript", ext: ["jsonld"], alias: ["jsonld"]},
    {name: "JSX", mime: "text/jsx", mode: "jsx", ext: ["jsx"]},
    {name: "Jinja2", mime: "text/jinja2", mode: "jinja2", ext: ["j2", "jinja", "jinja2"]},
    {name: "Julia", mime: "text/x-julia", mode: "julia", ext: ["jl"]},
    {name: "Kotlin", mime: "text/x-kotlin", mode: "clike", ext: ["kt"]},
    {name: "LESS", mime: "text/x-less", mode: "css", ext: ["less"]},
    {name: "LiveScript", mime: "text/x-livescript", mode: "livescript", ext: ["ls"], alias: ["ls"]},
    {name: "Lua", mime: "text/x-lua", mode: "lua", ext: ["lua"]},
    {name: "Markdown", mime: "text/x-markdown", mode: "markdown", ext: ["markdown", "md", "mkd"]},
    {name: "mIRC", mime: "text/mirc", mode: "mirc"},
    {name: "MariaDB SQL", mime: "text/x-mariadb", mode: "sql"},
    {name: "Mathematica", mime: "text/x-mathematica", mode: "mathematica", ext: ["m", "nb"]},
    {name: "Modelica", mime: "text/x-modelica", mode: "modelica", ext: ["mo"]},
    {name: "MUMPS", mime: "text/x-mumps", mode: "mumps", ext: ["mps"]},
    {name: "MS SQL", mime: "text/x-mssql", mode: "sql"},
    {name: "mbox", mime: "application/mbox", mode: "mbox", ext: ["mbox"]},
    {name: "MySQL", mime: "text/x-mysql", mode: "sql"},
    {name: "Nginx", mime: "text/x-nginx-conf", mode: "nginx", file: /nginx.*\.conf$/i},
    {name: "NSIS", mime: "text/x-nsis", mode: "nsis", ext: ["nsh", "nsi"]},
    {name: "NTriples", mimes: ["application/n-triples", "application/n-quads", "text/n-triples"],
     mode: "ntriples", ext: ["nt", "nq"]},
    {name: "Objective-C", mime: "text/x-objectivec", mode: "clike", ext: ["m", "mm"], alias: ["objective-c", "objc"]},
    {name: "OCaml", mime: "text/x-ocaml", mode: "mllike", ext: ["ml", "mli", "mll", "mly"]},
    {name: "Octave", mime: "text/x-octave", mode: "octave", ext: ["m"]},
    {name: "Oz", mime: "text/x-oz", mode: "oz", ext: ["oz"]},
    {name: "Pascal", mime: "text/x-pascal", mode: "pascal", ext: ["p", "pas"]},
    {name: "PEG.js", mime: "null", mode: "pegjs", ext: ["jsonld"]},
    {name: "Perl", mime: "text/x-perl", mode: "perl", ext: ["pl", "pm"]},
    {name: "PHP", mimes: ["text/x-php", "application/x-httpd-php", "application/x-httpd-php-open"], mode: "php", ext: ["php", "php3", "php4", "php5", "php7", "phtml"]},
    {name: "Pig", mime: "text/x-pig", mode: "pig", ext: ["pig"]},
    {name: "Plain Text", mime: "text/plain", mode: "null", ext: ["txt", "text", "conf", "def", "list", "log"]},
    {name: "PLSQL", mime: "text/x-plsql", mode: "sql", ext: ["pls"]},
    {name: "PowerShell", mime: "application/x-powershell", mode: "powershell", ext: ["ps1", "psd1", "psm1"]},
    {name: "Properties files", mime: "text/x-properties", mode: "properties", ext: ["properties", "ini", "in"], alias: ["ini", "properties"]},
    {name: "ProtoBuf", mime: "text/x-protobuf", mode: "protobuf", ext: ["proto"]},
    {name: "Python", mime: "text/x-python", mode: "python", ext: ["BUILD", "bzl", "py", "pyw"], file: /^(BUCK|BUILD)$/},
    {name: "Puppet", mime: "text/x-puppet", mode: "puppet", ext: ["pp"]},
    {name: "Q", mime: "text/x-q", mode: "q", ext: ["q"]},
    {name: "R", mime: "text/x-rsrc", mode: "r", ext: ["r", "R"], alias: ["rscript"]},
    {name: "reStructuredText", mime: "text/x-rst", mode: "rst", ext: ["rst"], alias: ["rst"]},
    {name: "RPM Changes", mime: "text/x-rpm-changes", mode: "rpm"},
    {name: "RPM Spec", mime: "text/x-rpm-spec", mode: "rpm", ext: ["spec"]},
    {name: "Ruby", mime: "text/x-ruby", mode: "ruby", ext: ["rb"], alias: ["jruby", "macruby", "rake", "rb", "rbx"]},
    {name: "Rust", mime: "text/x-rustsrc", mode: "rust", ext: ["rs"]},
    {name: "SAS", mime: "text/x-sas", mode: "sas", ext: ["sas"]},
    {name: "Sass", mime: "text/x-sass", mode: "sass", ext: ["sass"]},
    {name: "Scala", mime: "text/x-scala", mode: "clike", ext: ["scala"]},
    {name: "Scheme", mime: "text/x-scheme", mode: "scheme", ext: ["scm", "ss"]},
    {name: "SCSS", mime: "text/x-scss", mode: "css", ext: ["scss"]},
    {name: "Shell", mimes: ["text/x-sh", "application/x-sh"], mode: "shell", ext: ["sh", "ksh", "bash"], alias: ["bash", "sh", "zsh"], file: /^PKGBUILD$/},
    {name: "Sieve", mime: "application/sieve", mode: "sieve", ext: ["siv", "sieve"]},
    {name: "Slim", mimes: ["text/x-slim", "application/x-slim"], mode: "slim", ext: ["slim"]},
    {name: "Smalltalk", mime: "text/x-stsrc", mode: "smalltalk", ext: ["st"]},
    {name: "Smarty", mime: "text/x-smarty", mode: "smarty", ext: ["tpl"]},
    {name: "Solr", mime: "text/x-solr", mode: "solr"},
    {name: "SML", mime: "text/x-sml", mode: "mllike", ext: ["sml", "sig", "fun", "smackspec"]},
    {name: "Soy", mime: "text/x-soy", mode: "soy", ext: ["soy"], alias: ["closure template"]},
    {name: "SPARQL", mime: "application/sparql-query", mode: "sparql", ext: ["rq", "sparql"], alias: ["sparul"]},
    {name: "Spreadsheet", mime: "text/x-spreadsheet", mode: "spreadsheet", alias: ["excel", "formula"]},
    {name: "SQL", mime: "text/x-sql", mode: "sql", ext: ["sql"]},
    {name: "SQLite", mime: "text/x-sqlite", mode: "sql"},
    {name: "Squirrel", mime: "text/x-squirrel", mode: "clike", ext: ["nut"]},
    {name: "Stylus", mime: "text/x-styl", mode: "stylus", ext: ["styl"]},
    {name: "Swift", mime: "text/x-swift", mode: "swift", ext: ["swift"]},
    {name: "sTeX", mime: "text/x-stex", mode: "stex"},
    {name: "LaTeX", mime: "text/x-latex", mode: "stex", ext: ["text", "ltx", "tex"], alias: ["tex"]},
    {name: "SystemVerilog", mime: "text/x-systemverilog", mode: "verilog", ext: ["v", "sv", "svh"]},
    {name: "Tcl", mime: "text/x-tcl", mode: "tcl", ext: ["tcl"]},
    {name: "Textile", mime: "text/x-textile", mode: "textile", ext: ["textile"]},
    {name: "TiddlyWiki ", mime: "text/x-tiddlywiki", mode: "tiddlywiki"},
    {name: "Tiki wiki", mime: "text/tiki", mode: "tiki"},
    {name: "TOML", mime: "text/x-toml", mode: "toml", ext: ["toml"]},
    {name: "Tornado", mime: "text/x-tornado", mode: "tornado"},
    {name: "troff", mime: "text/troff", mode: "troff", ext: ["1", "2", "3", "4", "5", "6", "7", "8", "9"]},
    {name: "TTCN", mime: "text/x-ttcn", mode: "ttcn", ext: ["ttcn", "ttcn3", "ttcnpp"]},
    {name: "TTCN_CFG", mime: "text/x-ttcn-cfg", mode: "ttcn-cfg", ext: ["cfg"]},
    {name: "Turtle", mime: "text/turtle", mode: "turtle", ext: ["ttl"]},
    {name: "TypeScript", mime: "application/typescript", mode: "javascript", ext: ["ts"], alias: ["ts"]},
    {name: "TypeScript-JSX", mime: "text/typescript-jsx", mode: "jsx", ext: ["tsx"], alias: ["tsx"]},
    {name: "Twig", mime: "text/x-twig", mode: "twig"},
    {name: "Web IDL", mime: "text/x-webidl", mode: "webidl", ext: ["webidl"]},
    {name: "VB.NET", mime: "text/x-vb", mode: "vb", ext: ["vb"]},
    {name: "VBScript", mime: "text/vbscript", mode: "vbscript", ext: ["vbs"]},
    {name: "Velocity", mime: "text/velocity", mode: "velocity", ext: ["vtl"]},
    {name: "Verilog", mime: "text/x-verilog", mode: "verilog", ext: ["v"]},
    {name: "VHDL", mime: "text/x-vhdl", mode: "vhdl", ext: ["vhd", "vhdl"]},
    {name: "Vue.js Component", mimes: ["script/x-vue", "text/x-vue"], mode: "vue", ext: ["vue"]},
    {name: "XML", mimes: ["application/xml", "text/xml"], mode: "xml", ext: ["xml", "xsl", "xsd", "svg"], alias: ["rss", "wsdl", "xsd"]},
    {name: "XQuery", mime: "application/xquery", mode: "xquery", ext: ["xy", "xquery"]},
    {name: "Yacas", mime: "text/x-yacas", mode: "yacas", ext: ["ys"]},
    {name: "YAML", mimes: ["text/x-yaml", "text/yaml"], mode: "yaml", ext: ["yaml", "yml"], alias: ["yml"]},
    {name: "Z80", mime: "text/x-z80", mode: "z80", ext: ["z80"]},
    {name: "mscgen", mime: "text/x-mscgen", mode: "mscgen", ext: ["mscgen", "mscin", "msc"]},
    {name: "xu", mime: "text/x-xu", mode: "mscgen", ext: ["xu"]},
    {name: "msgenny", mime: "text/x-msgenny", mode: "mscgen", ext: ["msgenny"]}
  ];
  // Ensure all modes have a mime property for backwards compatibility
  for (var i = 0; i < CodeMirror.modeInfo.length; i++) {
    var info = CodeMirror.modeInfo[i];
    if (info.mimes) info.mime = info.mimes[0];
  }

  CodeMirror.findModeByMIME = function(mime) {
    mime = mime.toLowerCase();
    for (var i = 0; i < CodeMirror.modeInfo.length; i++) {
      var info = CodeMirror.modeInfo[i];
      if (info.mime == mime) return info;
      if (info.mimes) for (var j = 0; j < info.mimes.length; j++)
        if (info.mimes[j] == mime) return info;
    }
    if (/\+xml$/.test(mime)) return CodeMirror.findModeByMIME("application/xml")
    if (/\+json$/.test(mime)) return CodeMirror.findModeByMIME("application/json")
  };

  CodeMirror.findModeByExtension = function(ext) {
    for (var i = 0; i < CodeMirror.modeInfo.length; i++) {
      var info = CodeMirror.modeInfo[i];
      if (info.ext) for (var j = 0; j < info.ext.length; j++)
        if (info.ext[j] == ext) return info;
    }
  };

  CodeMirror.findModeByFileName = function(filename) {
    for (var i = 0; i < CodeMirror.modeInfo.length; i++) {
      var info = CodeMirror.modeInfo[i];
      if (info.file && info.file.test(filename)) return info;
    }
    var dot = filename.lastIndexOf(".");
    var ext = dot > -1 && filename.substring(dot + 1, filename.length);
    if (ext) return CodeMirror.findModeByExtension(ext);
  };

  CodeMirror.findModeByName = function(name) {
    name = name.toLowerCase();
    for (var i = 0; i < CodeMirror.modeInfo.length; i++) {
      var info = CodeMirror.modeInfo[i];
      if (info.name.toLowerCase() == name) return info;
      if (info.alias) for (var j = 0; j < info.alias.length; j++)
        if (info.alias[j].toLowerCase() == name) return info;
    }
  };
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/mode/markdown/markdown',[
  "../../CodeMirror",
  "../xml/xml",
  "../meta"
], function(CodeMirror) {



CodeMirror.defineMode("markdown", function(cmCfg, modeCfg) {

  var htmlMode = CodeMirror.getMode(cmCfg, "text/html");
  var htmlModeMissing = htmlMode.name == "null"

  function getMode(name) {
    if (CodeMirror.findModeByName) {
      var found = CodeMirror.findModeByName(name);
      if (found) name = found.mime || found.mimes[0];
    }
    var mode = CodeMirror.getMode(cmCfg, name);
    return mode.name == "null" ? null : mode;
  }

  // Should characters that affect highlighting be highlighted separate?
  // Does not include characters that will be output (such as `1.` and `-` for lists)
  if (modeCfg.highlightFormatting === undefined)
    modeCfg.highlightFormatting = false;

  // Maximum number of nested blockquotes. Set to 0 for infinite nesting.
  // Excess `>` will emit `error` token.
  if (modeCfg.maxBlockquoteDepth === undefined)
    modeCfg.maxBlockquoteDepth = 0;

  // Turn on task lists? ("- [ ] " and "- [x] ")
  if (modeCfg.taskLists === undefined) modeCfg.taskLists = false;

  // Turn on strikethrough syntax
  if (modeCfg.strikethrough === undefined)
    modeCfg.strikethrough = false;

  if (modeCfg.emoji === undefined)
    modeCfg.emoji = false;

  if (modeCfg.fencedCodeBlockHighlighting === undefined)
    modeCfg.fencedCodeBlockHighlighting = true;

  if (modeCfg.xml === undefined)
    modeCfg.xml = true;

  // Allow token types to be overridden by user-provided token types.
  if (modeCfg.tokenTypeOverrides === undefined)
    modeCfg.tokenTypeOverrides = {};

  var tokenTypes = {
    header: "header",
    code: "comment",
    quote: "quote",
    list1: "variable-2",
    list2: "variable-3",
    list3: "keyword",
    hr: "hr",
    image: "image",
    imageAltText: "image-alt-text",
    imageMarker: "image-marker",
    formatting: "formatting",
    linkInline: "link",
    linkEmail: "link",
    linkText: "link",
    linkHref: "string",
    em: "em",
    strong: "strong",
    strikethrough: "strikethrough",
    emoji: "builtin"
  };

  for (var tokenType in tokenTypes) {
    if (tokenTypes.hasOwnProperty(tokenType) && modeCfg.tokenTypeOverrides[tokenType]) {
      tokenTypes[tokenType] = modeCfg.tokenTypeOverrides[tokenType];
    }
  }

  var hrRE = /^([*\-_])(?:\s*\1){2,}\s*$/
  ,   listRE = /^(?:[*\-+]|^[0-9]+([.)]))\s+/
  ,   taskListRE = /^\[(x| )\](?=\s)/i // Must follow listRE
  ,   atxHeaderRE = modeCfg.allowAtxHeaderWithoutSpace ? /^(#+)/ : /^(#+)(?: |$)/
  ,   setextHeaderRE = /^ *(?:\={1,}|-{1,})\s*$/
  ,   textRE = /^[^#!\[\]*_\\<>` "'(~:]+/
  ,   fencedCodeRE = /^(~~~+|```+)[ \t]*([\w+#-]*)[^\n`]*$/
  ,   linkDefRE = /^\s*\[[^\]]+?\]:.*$/ // naive link-definition
  ,   punctuation = /[!"#$%&'()*+,\-.\/:;<=>?@\[\\\]^_`{|}~\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u0AF0\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166D\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E42\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC9\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDF3C-\uDF3E]|\uD809[\uDC70-\uDC74]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]/
  ,   expandedTab = "    " // CommonMark specifies tab as 4 spaces

  function switchInline(stream, state, f) {
    state.f = state.inline = f;
    return f(stream, state);
  }

  function switchBlock(stream, state, f) {
    state.f = state.block = f;
    return f(stream, state);
  }

  function lineIsEmpty(line) {
    return !line || !/\S/.test(line.string)
  }

  // Blocks

  function blankLine(state) {
    // Reset linkTitle state
    state.linkTitle = false;
    state.linkHref = false;
    state.linkText = false;
    // Reset EM state
    state.em = false;
    // Reset STRONG state
    state.strong = false;
    // Reset strikethrough state
    state.strikethrough = false;
    // Reset state.quote
    state.quote = 0;
    // Reset state.indentedCode
    state.indentedCode = false;
    if (state.f == htmlBlock) {
      var exit = htmlModeMissing
      if (!exit) {
        var inner = CodeMirror.innerMode(htmlMode, state.htmlState)
        exit = inner.mode.name == "xml" && inner.state.tagStart === null &&
          (!inner.state.context && inner.state.tokenize.isInText)
      }
      if (exit) {
        state.f = inlineNormal;
        state.block = blockNormal;
        state.htmlState = null;
      }
    }
    // Reset state.trailingSpace
    state.trailingSpace = 0;
    state.trailingSpaceNewLine = false;
    // Mark this line as blank
    state.prevLine = state.thisLine
    state.thisLine = {stream: null}
    return null;
  }

  function blockNormal(stream, state) {
    var firstTokenOnLine = stream.column() === state.indentation;
    var prevLineLineIsEmpty = lineIsEmpty(state.prevLine.stream);
    var prevLineIsIndentedCode = state.indentedCode;
    var prevLineIsHr = state.prevLine.hr;
    var prevLineIsList = state.list !== false;
    var maxNonCodeIndentation = (state.listStack[state.listStack.length - 1] || 0) + 3;

    state.indentedCode = false;

    var lineIndentation = state.indentation;
    // compute once per line (on first token)
    if (state.indentationDiff === null) {
      state.indentationDiff = state.indentation;
      if (prevLineIsList) {
        // Reset inline styles which shouldn't propagate aross list items
        state.em = false;
        state.strong = false;
        state.code = false;
        state.strikethrough = false;

        state.list = null;
        // While this list item's marker's indentation is less than the deepest
        //  list item's content's indentation,pop the deepest list item
        //  indentation off the stack, and update block indentation state
        while (lineIndentation < state.listStack[state.listStack.length - 1]) {
          state.listStack.pop();
          if (state.listStack.length) {
            state.indentation = state.listStack[state.listStack.length - 1];
          // less than the first list's indent -> the line is no longer a list
          } else {
            state.list = false;
          }
        }
        if (state.list !== false) {
          state.indentationDiff = lineIndentation - state.listStack[state.listStack.length - 1]
        }
      }
    }

    // not comprehensive (currently only for setext detection purposes)
    var allowsInlineContinuation = (
        !prevLineLineIsEmpty && !prevLineIsHr && !state.prevLine.header &&
        (!prevLineIsList || !prevLineIsIndentedCode) &&
        !state.prevLine.fencedCodeEnd
    );

    var isHr = (state.list === false || prevLineIsHr || prevLineLineIsEmpty) &&
      state.indentation <= maxNonCodeIndentation && stream.match(hrRE);

    var match = null;
    if (state.indentationDiff >= 4 && (prevLineIsIndentedCode || state.prevLine.fencedCodeEnd ||
         state.prevLine.header || prevLineLineIsEmpty)) {
      stream.skipToEnd();
      state.indentedCode = true;
      return tokenTypes.code;
    } else if (stream.eatSpace()) {
      return null;
    } else if (firstTokenOnLine && state.indentation <= maxNonCodeIndentation && (match = stream.match(atxHeaderRE)) && match[1].length <= 6) {
      state.quote = 0;
      state.header = match[1].length;
      state.thisLine.header = true;
      if (modeCfg.highlightFormatting) state.formatting = "header";
      state.f = state.inline;
      return getType(state);
    } else if (state.indentation <= maxNonCodeIndentation && stream.eat('>')) {
      state.quote = firstTokenOnLine ? 1 : state.quote + 1;
      if (modeCfg.highlightFormatting) state.formatting = "quote";
      stream.eatSpace();
      return getType(state);
    } else if (!isHr && !state.setext && firstTokenOnLine && state.indentation <= maxNonCodeIndentation && (match = stream.match(listRE))) {
      var listType = match[1] ? "ol" : "ul";

      state.indentation = lineIndentation + stream.current().length;
      state.list = true;
      state.quote = 0;

      // Add this list item's content's indentation to the stack
      state.listStack.push(state.indentation);

      if (modeCfg.taskLists && stream.match(taskListRE, false)) {
        state.taskList = true;
      }
      state.f = state.inline;
      if (modeCfg.highlightFormatting) state.formatting = ["list", "list-" + listType];
      return getType(state);
    } else if (firstTokenOnLine && state.indentation <= maxNonCodeIndentation && (match = stream.match(fencedCodeRE, true))) {
      state.quote = 0;
      state.fencedEndRE = new RegExp(match[1] + "+ *$");
      // try switching mode
      state.localMode = modeCfg.fencedCodeBlockHighlighting && getMode(match[2]);
      if (state.localMode) state.localState = CodeMirror.startState(state.localMode);
      state.f = state.block = local;
      if (modeCfg.highlightFormatting) state.formatting = "code-block";
      state.code = -1
      return getType(state);
    // SETEXT has lowest block-scope precedence after HR, so check it after
    //  the others (code, blockquote, list...)
    } else if (
      // if setext set, indicates line after ---/===
      state.setext || (
        // line before ---/===
        (!allowsInlineContinuation || !prevLineIsList) && !state.quote && state.list === false &&
        !state.code && !isHr && !linkDefRE.test(stream.string) &&
        (match = stream.lookAhead(1)) && (match = match.match(setextHeaderRE))
      )
    ) {
      if ( !state.setext ) {
        state.header = match[0].charAt(0) == '=' ? 1 : 2;
        state.setext = state.header;
      } else {
        state.header = state.setext;
        // has no effect on type so we can reset it now
        state.setext = 0;
        stream.skipToEnd();
        if (modeCfg.highlightFormatting) state.formatting = "header";
      }
      state.thisLine.header = true;
      state.f = state.inline;
      return getType(state);
    } else if (isHr) {
      stream.skipToEnd();
      state.hr = true;
      state.thisLine.hr = true;
      return tokenTypes.hr;
    } else if (stream.peek() === '[') {
      return switchInline(stream, state, footnoteLink);
    }

    return switchInline(stream, state, state.inline);
  }

  function htmlBlock(stream, state) {
    var style = htmlMode.token(stream, state.htmlState);
    if (!htmlModeMissing) {
      var inner = CodeMirror.innerMode(htmlMode, state.htmlState)
      if ((inner.mode.name == "xml" && inner.state.tagStart === null &&
           (!inner.state.context && inner.state.tokenize.isInText)) ||
          (state.md_inside && stream.current().indexOf(">") > -1)) {
        state.f = inlineNormal;
        state.block = blockNormal;
        state.htmlState = null;
      }
    }
    return style;
  }

  function local(stream, state) {
    var currListInd = state.listStack[state.listStack.length - 1] || 0;
    var hasExitedList = state.indentation < currListInd;
    var maxFencedEndInd = currListInd + 3;
    if (state.fencedEndRE && state.indentation <= maxFencedEndInd && (hasExitedList || stream.match(state.fencedEndRE))) {
      if (modeCfg.highlightFormatting) state.formatting = "code-block";
      var returnType;
      if (!hasExitedList) returnType = getType(state)
      state.localMode = state.localState = null;
      state.block = blockNormal;
      state.f = inlineNormal;
      state.fencedEndRE = null;
      state.code = 0
      state.thisLine.fencedCodeEnd = true;
      if (hasExitedList) return switchBlock(stream, state, state.block);
      return returnType;
    } else if (state.localMode) {
      return state.localMode.token(stream, state.localState);
    } else {
      stream.skipToEnd();
      return tokenTypes.code;
    }
  }

  // Inline
  function getType(state) {
    var styles = [];

    if (state.formatting) {
      styles.push(tokenTypes.formatting);

      if (typeof state.formatting === "string") state.formatting = [state.formatting];

      for (var i = 0; i < state.formatting.length; i++) {
        styles.push(tokenTypes.formatting + "-" + state.formatting[i]);

        if (state.formatting[i] === "header") {
          styles.push(tokenTypes.formatting + "-" + state.formatting[i] + "-" + state.header);
        }

        // Add `formatting-quote` and `formatting-quote-#` for blockquotes
        // Add `error` instead if the maximum blockquote nesting depth is passed
        if (state.formatting[i] === "quote") {
          if (!modeCfg.maxBlockquoteDepth || modeCfg.maxBlockquoteDepth >= state.quote) {
            styles.push(tokenTypes.formatting + "-" + state.formatting[i] + "-" + state.quote);
          } else {
            styles.push("error");
          }
        }
      }
    }

    if (state.taskOpen) {
      styles.push("meta");
      return styles.length ? styles.join(' ') : null;
    }
    if (state.taskClosed) {
      styles.push("property");
      return styles.length ? styles.join(' ') : null;
    }

    if (state.linkHref) {
      styles.push(tokenTypes.linkHref, "url");
    } else { // Only apply inline styles to non-url text
      if (state.strong) { styles.push(tokenTypes.strong); }
      if (state.em) { styles.push(tokenTypes.em); }
      if (state.strikethrough) { styles.push(tokenTypes.strikethrough); }
      if (state.emoji) { styles.push(tokenTypes.emoji); }
      if (state.linkText) { styles.push(tokenTypes.linkText); }
      if (state.code) { styles.push(tokenTypes.code); }
      if (state.image) { styles.push(tokenTypes.image); }
      if (state.imageAltText) { styles.push(tokenTypes.imageAltText, "link"); }
      if (state.imageMarker) { styles.push(tokenTypes.imageMarker); }
    }

    if (state.header) { styles.push(tokenTypes.header, tokenTypes.header + "-" + state.header); }

    if (state.quote) {
      styles.push(tokenTypes.quote);

      // Add `quote-#` where the maximum for `#` is modeCfg.maxBlockquoteDepth
      if (!modeCfg.maxBlockquoteDepth || modeCfg.maxBlockquoteDepth >= state.quote) {
        styles.push(tokenTypes.quote + "-" + state.quote);
      } else {
        styles.push(tokenTypes.quote + "-" + modeCfg.maxBlockquoteDepth);
      }
    }

    if (state.list !== false) {
      var listMod = (state.listStack.length - 1) % 3;
      if (!listMod) {
        styles.push(tokenTypes.list1);
      } else if (listMod === 1) {
        styles.push(tokenTypes.list2);
      } else {
        styles.push(tokenTypes.list3);
      }
    }

    if (state.trailingSpaceNewLine) {
      styles.push("trailing-space-new-line");
    } else if (state.trailingSpace) {
      styles.push("trailing-space-" + (state.trailingSpace % 2 ? "a" : "b"));
    }

    return styles.length ? styles.join(' ') : null;
  }

  function handleText(stream, state) {
    if (stream.match(textRE, true)) {
      return getType(state);
    }
    return undefined;
  }

  function inlineNormal(stream, state) {
    var style = state.text(stream, state);
    if (typeof style !== 'undefined')
      return style;

    if (state.list) { // List marker (*, +, -, 1., etc)
      state.list = null;
      return getType(state);
    }

    if (state.taskList) {
      var taskOpen = stream.match(taskListRE, true)[1] === " ";
      if (taskOpen) state.taskOpen = true;
      else state.taskClosed = true;
      if (modeCfg.highlightFormatting) state.formatting = "task";
      state.taskList = false;
      return getType(state);
    }

    state.taskOpen = false;
    state.taskClosed = false;

    if (state.header && stream.match(/^#+$/, true)) {
      if (modeCfg.highlightFormatting) state.formatting = "header";
      return getType(state);
    }

    var ch = stream.next();

    // Matches link titles present on next line
    if (state.linkTitle) {
      state.linkTitle = false;
      var matchCh = ch;
      if (ch === '(') {
        matchCh = ')';
      }
      matchCh = (matchCh+'').replace(/([.?*+^\[\]\\(){}|-])/g, "\\$1");
      var regex = '^\\s*(?:[^' + matchCh + '\\\\]+|\\\\\\\\|\\\\.)' + matchCh;
      if (stream.match(new RegExp(regex), true)) {
        return tokenTypes.linkHref;
      }
    }

    // If this block is changed, it may need to be updated in GFM mode
    if (ch === '`') {
      var previousFormatting = state.formatting;
      if (modeCfg.highlightFormatting) state.formatting = "code";
      stream.eatWhile('`');
      var count = stream.current().length
      if (state.code == 0 && (!state.quote || count == 1)) {
        state.code = count
        return getType(state)
      } else if (count == state.code) { // Must be exact
        var t = getType(state)
        state.code = 0
        return t
      } else {
        state.formatting = previousFormatting
        return getType(state)
      }
    } else if (state.code) {
      return getType(state);
    }

    if (ch === '\\') {
      stream.next();
      if (modeCfg.highlightFormatting) {
        var type = getType(state);
        var formattingEscape = tokenTypes.formatting + "-escape";
        return type ? type + " " + formattingEscape : formattingEscape;
      }
    }

    if (ch === '!' && stream.match(/\[[^\]]*\] ?(?:\(|\[)/, false)) {
      state.imageMarker = true;
      state.image = true;
      if (modeCfg.highlightFormatting) state.formatting = "image";
      return getType(state);
    }

    if (ch === '[' && state.imageMarker && stream.match(/[^\]]*\](\(.*?\)| ?\[.*?\])/, false)) {
      state.imageMarker = false;
      state.imageAltText = true
      if (modeCfg.highlightFormatting) state.formatting = "image";
      return getType(state);
    }

    if (ch === ']' && state.imageAltText) {
      if (modeCfg.highlightFormatting) state.formatting = "image";
      var type = getType(state);
      state.imageAltText = false;
      state.image = false;
      state.inline = state.f = linkHref;
      return type;
    }

    if (ch === '[' && !state.image) {
      if (state.linkText && stream.match(/^.*?\]/)) return getType(state)
      state.linkText = true;
      if (modeCfg.highlightFormatting) state.formatting = "link";
      return getType(state);
    }

    if (ch === ']' && state.linkText) {
      if (modeCfg.highlightFormatting) state.formatting = "link";
      var type = getType(state);
      state.linkText = false;
      state.inline = state.f = stream.match(/\(.*?\)| ?\[.*?\]/, false) ? linkHref : inlineNormal
      return type;
    }

    if (ch === '<' && stream.match(/^(https?|ftps?):\/\/(?:[^\\>]|\\.)+>/, false)) {
      state.f = state.inline = linkInline;
      if (modeCfg.highlightFormatting) state.formatting = "link";
      var type = getType(state);
      if (type){
        type += " ";
      } else {
        type = "";
      }
      return type + tokenTypes.linkInline;
    }

    if (ch === '<' && stream.match(/^[^> \\]+@(?:[^\\>]|\\.)+>/, false)) {
      state.f = state.inline = linkInline;
      if (modeCfg.highlightFormatting) state.formatting = "link";
      var type = getType(state);
      if (type){
        type += " ";
      } else {
        type = "";
      }
      return type + tokenTypes.linkEmail;
    }

    if (modeCfg.xml && ch === '<' && stream.match(/^(!--|\?|!\[CDATA\[|[a-z][a-z0-9-]*(?:\s+[a-z_:.\-]+(?:\s*=\s*[^>]+)?)*\s*(?:>|$))/i, false)) {
      var end = stream.string.indexOf(">", stream.pos);
      if (end != -1) {
        var atts = stream.string.substring(stream.start, end);
        if (/markdown\s*=\s*('|"){0,1}1('|"){0,1}/.test(atts)) state.md_inside = true;
      }
      stream.backUp(1);
      state.htmlState = CodeMirror.startState(htmlMode);
      return switchBlock(stream, state, htmlBlock);
    }

    if (modeCfg.xml && ch === '<' && stream.match(/^\/\w*?>/)) {
      state.md_inside = false;
      return "tag";
    } else if (ch === "*" || ch === "_") {
      var len = 1, before = stream.pos == 1 ? " " : stream.string.charAt(stream.pos - 2)
      while (len < 3 && stream.eat(ch)) len++
      var after = stream.peek() || " "
      // See http://spec.commonmark.org/0.27/#emphasis-and-strong-emphasis
      var leftFlanking = !/\s/.test(after) && (!punctuation.test(after) || /\s/.test(before) || punctuation.test(before))
      var rightFlanking = !/\s/.test(before) && (!punctuation.test(before) || /\s/.test(after) || punctuation.test(after))
      var setEm = null, setStrong = null
      if (len % 2) { // Em
        if (!state.em && leftFlanking && (ch === "*" || !rightFlanking || punctuation.test(before)))
          setEm = true
        else if (state.em == ch && rightFlanking && (ch === "*" || !leftFlanking || punctuation.test(after)))
          setEm = false
      }
      if (len > 1) { // Strong
        if (!state.strong && leftFlanking && (ch === "*" || !rightFlanking || punctuation.test(before)))
          setStrong = true
        else if (state.strong == ch && rightFlanking && (ch === "*" || !leftFlanking || punctuation.test(after)))
          setStrong = false
      }
      if (setStrong != null || setEm != null) {
        if (modeCfg.highlightFormatting) state.formatting = setEm == null ? "strong" : setStrong == null ? "em" : "strong em"
        if (setEm === true) state.em = ch
        if (setStrong === true) state.strong = ch
        var t = getType(state)
        if (setEm === false) state.em = false
        if (setStrong === false) state.strong = false
        return t
      }
    } else if (ch === ' ') {
      if (stream.eat('*') || stream.eat('_')) { // Probably surrounded by spaces
        if (stream.peek() === ' ') { // Surrounded by spaces, ignore
          return getType(state);
        } else { // Not surrounded by spaces, back up pointer
          stream.backUp(1);
        }
      }
    }

    if (modeCfg.strikethrough) {
      if (ch === '~' && stream.eatWhile(ch)) {
        if (state.strikethrough) {// Remove strikethrough
          if (modeCfg.highlightFormatting) state.formatting = "strikethrough";
          var t = getType(state);
          state.strikethrough = false;
          return t;
        } else if (stream.match(/^[^\s]/, false)) {// Add strikethrough
          state.strikethrough = true;
          if (modeCfg.highlightFormatting) state.formatting = "strikethrough";
          return getType(state);
        }
      } else if (ch === ' ') {
        if (stream.match(/^~~/, true)) { // Probably surrounded by space
          if (stream.peek() === ' ') { // Surrounded by spaces, ignore
            return getType(state);
          } else { // Not surrounded by spaces, back up pointer
            stream.backUp(2);
          }
        }
      }
    }

    if (modeCfg.emoji && ch === ":" && stream.match(/^(?:[a-z_\d+][a-z_\d+-]*|\-[a-z_\d+][a-z_\d+-]*):/)) {
      state.emoji = true;
      if (modeCfg.highlightFormatting) state.formatting = "emoji";
      var retType = getType(state);
      state.emoji = false;
      return retType;
    }

    if (ch === ' ') {
      if (stream.match(/^ +$/, false)) {
        state.trailingSpace++;
      } else if (state.trailingSpace) {
        state.trailingSpaceNewLine = true;
      }
    }

    return getType(state);
  }

  function linkInline(stream, state) {
    var ch = stream.next();

    if (ch === ">") {
      state.f = state.inline = inlineNormal;
      if (modeCfg.highlightFormatting) state.formatting = "link";
      var type = getType(state);
      if (type){
        type += " ";
      } else {
        type = "";
      }
      return type + tokenTypes.linkInline;
    }

    stream.match(/^[^>]+/, true);

    return tokenTypes.linkInline;
  }

  function linkHref(stream, state) {
    // Check if space, and return NULL if so (to avoid marking the space)
    if(stream.eatSpace()){
      return null;
    }
    var ch = stream.next();
    if (ch === '(' || ch === '[') {
      state.f = state.inline = getLinkHrefInside(ch === "(" ? ")" : "]");
      if (modeCfg.highlightFormatting) state.formatting = "link-string";
      state.linkHref = true;
      return getType(state);
    }
    return 'error';
  }

  var linkRE = {
    ")": /^(?:[^\\\(\)]|\\.|\((?:[^\\\(\)]|\\.)*\))*?(?=\))/,
    "]": /^(?:[^\\\[\]]|\\.|\[(?:[^\\\[\]]|\\.)*\])*?(?=\])/
  }

  function getLinkHrefInside(endChar) {
    return function(stream, state) {
      var ch = stream.next();

      if (ch === endChar) {
        state.f = state.inline = inlineNormal;
        if (modeCfg.highlightFormatting) state.formatting = "link-string";
        var returnState = getType(state);
        state.linkHref = false;
        return returnState;
      }

      stream.match(linkRE[endChar])
      state.linkHref = true;
      return getType(state);
    };
  }

  function footnoteLink(stream, state) {
    if (stream.match(/^([^\]\\]|\\.)*\]:/, false)) {
      state.f = footnoteLinkInside;
      stream.next(); // Consume [
      if (modeCfg.highlightFormatting) state.formatting = "link";
      state.linkText = true;
      return getType(state);
    }
    return switchInline(stream, state, inlineNormal);
  }

  function footnoteLinkInside(stream, state) {
    if (stream.match(/^\]:/, true)) {
      state.f = state.inline = footnoteUrl;
      if (modeCfg.highlightFormatting) state.formatting = "link";
      var returnType = getType(state);
      state.linkText = false;
      return returnType;
    }

    stream.match(/^([^\]\\]|\\.)+/, true);

    return tokenTypes.linkText;
  }

  function footnoteUrl(stream, state) {
    // Check if space, and return NULL if so (to avoid marking the space)
    if(stream.eatSpace()){
      return null;
    }
    // Match URL
    stream.match(/^[^\s]+/, true);
    // Check for link title
    if (stream.peek() === undefined) { // End of line, set flag to check next line
      state.linkTitle = true;
    } else { // More content on line, check if link title
      stream.match(/^(?:\s+(?:"(?:[^"\\]|\\\\|\\.)+"|'(?:[^'\\]|\\\\|\\.)+'|\((?:[^)\\]|\\\\|\\.)+\)))?/, true);
    }
    state.f = state.inline = inlineNormal;
    return tokenTypes.linkHref + " url";
  }

  var mode = {
    startState: function() {
      return {
        f: blockNormal,

        prevLine: {stream: null},
        thisLine: {stream: null},

        block: blockNormal,
        htmlState: null,
        indentation: 0,

        inline: inlineNormal,
        text: handleText,

        formatting: false,
        linkText: false,
        linkHref: false,
        linkTitle: false,
        code: 0,
        em: false,
        strong: false,
        header: 0,
        setext: 0,
        hr: false,
        taskList: false,
        list: false,
        listStack: [],
        quote: 0,
        trailingSpace: 0,
        trailingSpaceNewLine: false,
        strikethrough: false,
        emoji: false,
        fencedEndRE: null
      };
    },

    copyState: function(s) {
      return {
        f: s.f,

        prevLine: s.prevLine,
        thisLine: s.thisLine,

        block: s.block,
        htmlState: s.htmlState && CodeMirror.copyState(htmlMode, s.htmlState),
        indentation: s.indentation,

        localMode: s.localMode,
        localState: s.localMode ? CodeMirror.copyState(s.localMode, s.localState) : null,

        inline: s.inline,
        text: s.text,
        formatting: false,
        linkText: s.linkText,
        linkTitle: s.linkTitle,
        linkHref: s.linkHref,
        code: s.code,
        em: s.em,
        strong: s.strong,
        strikethrough: s.strikethrough,
        emoji: s.emoji,
        header: s.header,
        setext: s.setext,
        hr: s.hr,
        taskList: s.taskList,
        list: s.list,
        listStack: s.listStack.slice(0),
        quote: s.quote,
        indentedCode: s.indentedCode,
        trailingSpace: s.trailingSpace,
        trailingSpaceNewLine: s.trailingSpaceNewLine,
        md_inside: s.md_inside,
        fencedEndRE: s.fencedEndRE
      };
    },

    token: function(stream, state) {

      // Reset state.formatting
      state.formatting = false;

      if (stream != state.thisLine.stream) {
        state.header = 0;
        state.hr = false;

        if (stream.match(/^\s*$/, true)) {
          blankLine(state);
          return null;
        }

        state.prevLine = state.thisLine
        state.thisLine = {stream: stream}

        // Reset state.taskList
        state.taskList = false;

        // Reset state.trailingSpace
        state.trailingSpace = 0;
        state.trailingSpaceNewLine = false;

        if (!state.localState) {
          state.f = state.block;
          if (state.f != htmlBlock) {
            var indentation = stream.match(/^\s*/, true)[0].replace(/\t/g, expandedTab).length;
            state.indentation = indentation;
            state.indentationDiff = null;
            if (indentation > 0) return null;
          }
        }
      }
      return state.f(stream, state);
    },

    innerMode: function(state) {
      if (state.block == htmlBlock) return {state: state.htmlState, mode: htmlMode};
      if (state.localState) return {state: state.localState, mode: state.localMode};
      return {state: state, mode: mode};
    },

    indent: function(state, textAfter, line) {
      if (state.block == htmlBlock && htmlMode.indent) return htmlMode.indent(state.htmlState, textAfter, line)
      if (state.localState && state.localMode.indent) return state.localMode.indent(state.localState, textAfter, line)
      return CodeMirror.Pass
    },

    blankLine: blankLine,

    getType: getType,

    blockCommentStart: "<!--",
    blockCommentEnd: "-->",
    closeBrackets: "()[]{}''\"\"``",
    fold: "markdown"
  };
  return mode;
}, "xml");

CodeMirror.defineMIME("text/markdown", "markdown");

CodeMirror.defineMIME("text/x-markdown", "markdown");

});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE
define('skylark-codemirror/addon/comment/comment',["../../CodeMirror"], function(CodeMirror) {
  "use strict";

  var noOptions = {};
  var nonWS = /[^\s\u00a0]/;
  var Pos = CodeMirror.Pos;

  function firstNonWS(str) {
    var found = str.search(nonWS);
    return found == -1 ? 0 : found;
  }

  CodeMirror.commands.toggleComment = function(cm) {
    cm.toggleComment();
  };

  CodeMirror.defineExtension("toggleComment", function(options) {
    if (!options) options = noOptions;
    var cm = this;
    var minLine = Infinity, ranges = this.listSelections(), mode = null;
    for (var i = ranges.length - 1; i >= 0; i--) {
      var from = ranges[i].from(), to = ranges[i].to();
      if (from.line >= minLine) continue;
      if (to.line >= minLine) to = Pos(minLine, 0);
      minLine = from.line;
      if (mode == null) {
        if (cm.uncomment(from, to, options)) mode = "un";
        else { cm.lineComment(from, to, options); mode = "line"; }
      } else if (mode == "un") {
        cm.uncomment(from, to, options);
      } else {
        cm.lineComment(from, to, options);
      }
    }
  });

  // Rough heuristic to try and detect lines that are part of multi-line string
  function probablyInsideString(cm, pos, line) {
    return /\bstring\b/.test(cm.getTokenTypeAt(Pos(pos.line, 0))) && !/^[\'\"\`]/.test(line)
  }

  function getMode(cm, pos) {
    var mode = cm.getMode()
    return mode.useInnerComments === false || !mode.innerMode ? mode : cm.getModeAt(pos)
  }

  CodeMirror.defineExtension("lineComment", function(from, to, options) {
    if (!options) options = noOptions;
    var self = this, mode = getMode(self, from);
    var firstLine = self.getLine(from.line);
    if (firstLine == null || probablyInsideString(self, from, firstLine)) return;

    var commentString = options.lineComment || mode.lineComment;
    if (!commentString) {
      if (options.blockCommentStart || mode.blockCommentStart) {
        options.fullLines = true;
        self.blockComment(from, to, options);
      }
      return;
    }

    var end = Math.min(to.ch != 0 || to.line == from.line ? to.line + 1 : to.line, self.lastLine() + 1);
    var pad = options.padding == null ? " " : options.padding;
    var blankLines = options.commentBlankLines || from.line == to.line;

    self.operation(function() {
      if (options.indent) {
        var baseString = null;
        for (var i = from.line; i < end; ++i) {
          var line = self.getLine(i);
          var whitespace = line.slice(0, firstNonWS(line));
          if (baseString == null || baseString.length > whitespace.length) {
            baseString = whitespace;
          }
        }
        for (var i = from.line; i < end; ++i) {
          var line = self.getLine(i), cut = baseString.length;
          if (!blankLines && !nonWS.test(line)) continue;
          if (line.slice(0, cut) != baseString) cut = firstNonWS(line);
          self.replaceRange(baseString + commentString + pad, Pos(i, 0), Pos(i, cut));
        }
      } else {
        for (var i = from.line; i < end; ++i) {
          if (blankLines || nonWS.test(self.getLine(i)))
            self.replaceRange(commentString + pad, Pos(i, 0));
        }
      }
    });
  });

  CodeMirror.defineExtension("blockComment", function(from, to, options) {
    if (!options) options = noOptions;
    var self = this, mode = getMode(self, from);
    var startString = options.blockCommentStart || mode.blockCommentStart;
    var endString = options.blockCommentEnd || mode.blockCommentEnd;
    if (!startString || !endString) {
      if ((options.lineComment || mode.lineComment) && options.fullLines != false)
        self.lineComment(from, to, options);
      return;
    }
    if (/\bcomment\b/.test(self.getTokenTypeAt(Pos(from.line, 0)))) return

    var end = Math.min(to.line, self.lastLine());
    if (end != from.line && to.ch == 0 && nonWS.test(self.getLine(end))) --end;

    var pad = options.padding == null ? " " : options.padding;
    if (from.line > end) return;

    self.operation(function() {
      if (options.fullLines != false) {
        var lastLineHasText = nonWS.test(self.getLine(end));
        self.replaceRange(pad + endString, Pos(end));
        self.replaceRange(startString + pad, Pos(from.line, 0));
        var lead = options.blockCommentLead || mode.blockCommentLead;
        if (lead != null) for (var i = from.line + 1; i <= end; ++i)
          if (i != end || lastLineHasText)
            self.replaceRange(lead + pad, Pos(i, 0));
      } else {
        self.replaceRange(endString, to);
        self.replaceRange(startString, from);
      }
    });
  });

  CodeMirror.defineExtension("uncomment", function(from, to, options) {
    if (!options) options = noOptions;
    var self = this, mode = getMode(self, from);
    var end = Math.min(to.ch != 0 || to.line == from.line ? to.line : to.line - 1, self.lastLine()), start = Math.min(from.line, end);

    // Try finding line comments
    var lineString = options.lineComment || mode.lineComment, lines = [];
    var pad = options.padding == null ? " " : options.padding, didSomething;
    lineComment: {
      if (!lineString) break lineComment;
      for (var i = start; i <= end; ++i) {
        var line = self.getLine(i);
        var found = line.indexOf(lineString);
        if (found > -1 && !/comment/.test(self.getTokenTypeAt(Pos(i, found + 1)))) found = -1;
        if (found == -1 && nonWS.test(line)) break lineComment;
        if (found > -1 && nonWS.test(line.slice(0, found))) break lineComment;
        lines.push(line);
      }
      self.operation(function() {
        for (var i = start; i <= end; ++i) {
          var line = lines[i - start];
          var pos = line.indexOf(lineString), endPos = pos + lineString.length;
          if (pos < 0) continue;
          if (line.slice(endPos, endPos + pad.length) == pad) endPos += pad.length;
          didSomething = true;
          self.replaceRange("", Pos(i, pos), Pos(i, endPos));
        }
      });
      if (didSomething) return true;
    }

    // Try block comments
    var startString = options.blockCommentStart || mode.blockCommentStart;
    var endString = options.blockCommentEnd || mode.blockCommentEnd;
    if (!startString || !endString) return false;
    var lead = options.blockCommentLead || mode.blockCommentLead;
    var startLine = self.getLine(start), open = startLine.indexOf(startString)
    if (open == -1) return false
    var endLine = end == start ? startLine : self.getLine(end)
    var close = endLine.indexOf(endString, end == start ? open + startString.length : 0);
    var insideStart = Pos(start, open + 1), insideEnd = Pos(end, close + 1)
    if (close == -1 ||
        !/comment/.test(self.getTokenTypeAt(insideStart)) ||
        !/comment/.test(self.getTokenTypeAt(insideEnd)) ||
        self.getRange(insideStart, insideEnd, "\n").indexOf(endString) > -1)
      return false;

    // Avoid killing block comments completely outside the selection.
    // Positions of the last startString before the start of the selection, and the first endString after it.
    var lastStart = startLine.lastIndexOf(startString, from.ch);
    var firstEnd = lastStart == -1 ? -1 : startLine.slice(0, from.ch).indexOf(endString, lastStart + startString.length);
    if (lastStart != -1 && firstEnd != -1 && firstEnd + endString.length != from.ch) return false;
    // Positions of the first endString after the end of the selection, and the last startString before it.
    firstEnd = endLine.indexOf(endString, to.ch);
    var almostLastStart = endLine.slice(to.ch).lastIndexOf(startString, firstEnd - to.ch);
    lastStart = (firstEnd == -1 || almostLastStart == -1) ? -1 : to.ch + almostLastStart;
    if (firstEnd != -1 && lastStart != -1 && lastStart != to.ch) return false;

    self.operation(function() {
      self.replaceRange("", Pos(end, close - (pad && endLine.slice(close - pad.length, close) == pad ? pad.length : 0)),
                        Pos(end, close + endString.length));
      var openEnd = open + startString.length;
      if (pad && startLine.slice(openEnd, openEnd + pad.length) == pad) openEnd += pad.length;
      self.replaceRange("", Pos(start, open), Pos(start, openEnd));
      if (lead) for (var i = start + 1; i <= end; ++i) {
        var line = self.getLine(i), found = line.indexOf(lead);
        if (found == -1 || nonWS.test(line.slice(0, found))) continue;
        var foundEnd = found + lead.length;
        if (pad && line.slice(foundEnd, foundEnd + pad.length) == pad) foundEnd += pad.length;
        self.replaceRange("", Pos(i, found), Pos(i, foundEnd));
      }
    });
    return true;
  });
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/selection/active-line',["../../CodeMirror"], function(CodeMirror) {
  "use strict";
  var WRAP_CLASS = "CodeMirror-activeline";
  var BACK_CLASS = "CodeMirror-activeline-background";
  var GUTT_CLASS = "CodeMirror-activeline-gutter";

  CodeMirror.defineOption("styleActiveLine", false, function(cm, val, old) {
    var prev = old == CodeMirror.Init ? false : old;
    if (val == prev) return
    if (prev) {
      cm.off("beforeSelectionChange", selectionChange);
      clearActiveLines(cm);
      delete cm.state.activeLines;
    }
    if (val) {
      cm.state.activeLines = [];
      updateActiveLines(cm, cm.listSelections());
      cm.on("beforeSelectionChange", selectionChange);
    }
  });

  function clearActiveLines(cm) {
    for (var i = 0; i < cm.state.activeLines.length; i++) {
      cm.removeLineClass(cm.state.activeLines[i], "wrap", WRAP_CLASS);
      cm.removeLineClass(cm.state.activeLines[i], "background", BACK_CLASS);
      cm.removeLineClass(cm.state.activeLines[i], "gutter", GUTT_CLASS);
    }
  }

  function sameArray(a, b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++)
      if (a[i] != b[i]) return false;
    return true;
  }

  function updateActiveLines(cm, ranges) {
    var active = [];
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      var option = cm.getOption("styleActiveLine");
      if (typeof option == "object" && option.nonEmpty ? range.anchor.line != range.head.line : !range.empty())
        continue
      var line = cm.getLineHandleVisualStart(range.head.line);
      if (active[active.length - 1] != line) active.push(line);
    }
    if (sameArray(cm.state.activeLines, active)) return;
    cm.operation(function() {
      clearActiveLines(cm);
      for (var i = 0; i < active.length; i++) {
        cm.addLineClass(active[i], "wrap", WRAP_CLASS);
        cm.addLineClass(active[i], "background", BACK_CLASS);
        cm.addLineClass(active[i], "gutter", GUTT_CLASS);
      }
      cm.state.activeLines = active;
    });
  }

  function selectionChange(cm, sel) {
    updateActiveLines(cm, sel.ranges);
  }
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/fold/foldcode',["../../CodeMirror"], function(CodeMirror) {
  "use strict";

  function doFold(cm, pos, options, force) {
    if (options && options.call) {
      var finder = options;
      options = null;
    } else {
      var finder = getOption(cm, options, "rangeFinder");
    }
    if (typeof pos == "number") pos = CodeMirror.Pos(pos, 0);
    var minSize = getOption(cm, options, "minFoldSize");

    function getRange(allowFolded) {
      var range = finder(cm, pos);
      if (!range || range.to.line - range.from.line < minSize) return null;
      var marks = cm.findMarksAt(range.from);
      for (var i = 0; i < marks.length; ++i) {
        if (marks[i].__isFold && force !== "fold") {
          if (!allowFolded) return null;
          range.cleared = true;
          marks[i].clear();
        }
      }
      return range;
    }

    var range = getRange(true);
    if (getOption(cm, options, "scanUp")) while (!range && pos.line > cm.firstLine()) {
      pos = CodeMirror.Pos(pos.line - 1, 0);
      range = getRange(false);
    }
    if (!range || range.cleared || force === "unfold") return;

    var myWidget = makeWidget(cm, options);
    CodeMirror.on(myWidget, "mousedown", function(e) {
      myRange.clear();
      CodeMirror.e_preventDefault(e);
    });
    var myRange = cm.markText(range.from, range.to, {
      replacedWith: myWidget,
      clearOnEnter: getOption(cm, options, "clearOnEnter"),
      __isFold: true
    });
    myRange.on("clear", function(from, to) {
      CodeMirror.signal(cm, "unfold", cm, from, to);
    });
    CodeMirror.signal(cm, "fold", cm, range.from, range.to);
  }

  function makeWidget(cm, options) {
    var widget = getOption(cm, options, "widget");
    if (typeof widget == "string") {
      var text = document.createTextNode(widget);
      widget = document.createElement("span");
      widget.appendChild(text);
      widget.className = "CodeMirror-foldmarker";
    } else if (widget) {
      widget = widget.cloneNode(true)
    }
    return widget;
  }

  // Clumsy backwards-compatible interface
  CodeMirror.newFoldFunction = function(rangeFinder, widget) {
    return function(cm, pos) { doFold(cm, pos, {rangeFinder: rangeFinder, widget: widget}); };
  };

  // New-style interface
  CodeMirror.defineExtension("foldCode", function(pos, options, force) {
    doFold(this, pos, options, force);
  });

  CodeMirror.defineExtension("isFolded", function(pos) {
    var marks = this.findMarksAt(pos);
    for (var i = 0; i < marks.length; ++i)
      if (marks[i].__isFold) return true;
  });

  CodeMirror.commands.toggleFold = function(cm) {
    cm.foldCode(cm.getCursor());
  };
  CodeMirror.commands.fold = function(cm) {
    cm.foldCode(cm.getCursor(), null, "fold");
  };
  CodeMirror.commands.unfold = function(cm) {
    cm.foldCode(cm.getCursor(), null, "unfold");
  };
  CodeMirror.commands.foldAll = function(cm) {
    cm.operation(function() {
      for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++)
        cm.foldCode(CodeMirror.Pos(i, 0), null, "fold");
    });
  };
  CodeMirror.commands.unfoldAll = function(cm) {
    cm.operation(function() {
      for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++)
        cm.foldCode(CodeMirror.Pos(i, 0), null, "unfold");
    });
  };

  CodeMirror.registerHelper("fold", "combine", function() {
    var funcs = Array.prototype.slice.call(arguments, 0);
    return function(cm, start) {
      for (var i = 0; i < funcs.length; ++i) {
        var found = funcs[i](cm, start);
        if (found) return found;
      }
    };
  });

  CodeMirror.registerHelper("fold", "auto", function(cm, start) {
    var helpers = cm.getHelpers(start, "fold");
    for (var i = 0; i < helpers.length; i++) {
      var cur = helpers[i](cm, start);
      if (cur) return cur;
    }
  });

  var defaultOptions = {
    rangeFinder: CodeMirror.fold.auto,
    widget: "\u2194",
    minFoldSize: 0,
    scanUp: false,
    clearOnEnter: true
  };

  CodeMirror.defineOption("foldOptions", null);

  function getOption(cm, options, name) {
    if (options && options[name] !== undefined)
      return options[name];
    var editorOptions = cm.options.foldOptions;
    if (editorOptions && editorOptions[name] !== undefined)
      return editorOptions[name];
    return defaultOptions[name];
  }

  CodeMirror.defineExtension("foldOption", function(options, name) {
    return getOption(this, options, name);
  });
});

define('skylark-codemirror/addon/fold/foldgutter',[
  "../../CodeMirror", 
  "./foldcode"
],function(CodeMirror) {
  "use strict";

  CodeMirror.defineOption("foldGutter", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init) {
      cm.clearGutter(cm.state.foldGutter.options.gutter);
      cm.state.foldGutter = null;
      cm.off("gutterClick", onGutterClick);
      cm.off("change", onChange);
      cm.off("viewportChange", onViewportChange);
      cm.off("fold", onFold);
      cm.off("unfold", onFold);
      cm.off("swapDoc", onChange);
    }
    if (val) {
      cm.state.foldGutter = new State(parseOptions(val));
      updateInViewport(cm);
      cm.on("gutterClick", onGutterClick);
      cm.on("change", onChange);
      cm.on("viewportChange", onViewportChange);
      cm.on("fold", onFold);
      cm.on("unfold", onFold);
      cm.on("swapDoc", onChange);
    }
  });

  var Pos = CodeMirror.Pos;

  function State(options) {
    this.options = options;
    this.from = this.to = 0;
  }

  function parseOptions(opts) {
    if (opts === true) opts = {};
    if (opts.gutter == null) opts.gutter = "CodeMirror-foldgutter";
    if (opts.indicatorOpen == null) opts.indicatorOpen = "CodeMirror-foldgutter-open";
    if (opts.indicatorFolded == null) opts.indicatorFolded = "CodeMirror-foldgutter-folded";
    return opts;
  }

  function isFolded(cm, line) {
    var marks = cm.findMarks(Pos(line, 0), Pos(line + 1, 0));
    for (var i = 0; i < marks.length; ++i)
      if (marks[i].__isFold && marks[i].find().from.line == line) return marks[i];
  }

  function marker(spec) {
    if (typeof spec == "string") {
      var elt = document.createElement("div");
      elt.className = spec + " CodeMirror-guttermarker-subtle";
      return elt;
    } else {
      return spec.cloneNode(true);
    }
  }

  function updateFoldInfo(cm, from, to) {
    var opts = cm.state.foldGutter.options, cur = from;
    var minSize = cm.foldOption(opts, "minFoldSize");
    var func = cm.foldOption(opts, "rangeFinder");
    cm.eachLine(from, to, function(line) {
      var mark = null;
      if (isFolded(cm, cur)) {
        mark = marker(opts.indicatorFolded);
      } else {
        var pos = Pos(cur, 0);
        var range = func && func(cm, pos);
        if (range && range.to.line - range.from.line >= minSize)
          mark = marker(opts.indicatorOpen);
      }
      cm.setGutterMarker(line, opts.gutter, mark);
      ++cur;
    });
  }

  function updateInViewport(cm) {
    var vp = cm.getViewport(), state = cm.state.foldGutter;
    if (!state) return;
    cm.operation(function() {
      updateFoldInfo(cm, vp.from, vp.to);
    });
    state.from = vp.from; state.to = vp.to;
  }

  function onGutterClick(cm, line, gutter) {
    var state = cm.state.foldGutter;
    if (!state) return;
    var opts = state.options;
    if (gutter != opts.gutter) return;
    var folded = isFolded(cm, line);
    if (folded) folded.clear();
    else cm.foldCode(Pos(line, 0), opts.rangeFinder);
  }

  function onChange(cm) {
    var state = cm.state.foldGutter;
    if (!state) return;
    var opts = state.options;
    state.from = state.to = 0;
    clearTimeout(state.changeUpdate);
    state.changeUpdate = setTimeout(function() { updateInViewport(cm); }, opts.foldOnChangeTimeSpan || 600);
  }

  function onViewportChange(cm) {
    var state = cm.state.foldGutter;
    if (!state) return;
    var opts = state.options;
    clearTimeout(state.changeUpdate);
    state.changeUpdate = setTimeout(function() {
      var vp = cm.getViewport();
      if (state.from == state.to || vp.from - state.to > 20 || state.from - vp.to > 20) {
        updateInViewport(cm);
      } else {
        cm.operation(function() {
          if (vp.from < state.from) {
            updateFoldInfo(cm, vp.from, state.from);
            state.from = vp.from;
          }
          if (vp.to > state.to) {
            updateFoldInfo(cm, state.to, vp.to);
            state.to = vp.to;
          }
        });
      }
    }, opts.updateViewportTimeSpan || 400);
  }

  function onFold(cm, from) {
    var state = cm.state.foldGutter;
    if (!state) return;
    var line = from.line;
    if (line >= state.from && line < state.to)
      updateFoldInfo(cm, line, line + 1);
  }
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/fold/brace-fold',["../../CodeMirror"], function(CodeMirror) {
"use strict";

CodeMirror.registerHelper("fold", "brace", function(cm, start) {
  var line = start.line, lineText = cm.getLine(line);
  var tokenType;

  function findOpening(openCh) {
    for (var at = start.ch, pass = 0;;) {
      var found = at <= 0 ? -1 : lineText.lastIndexOf(openCh, at - 1);
      if (found == -1) {
        if (pass == 1) break;
        pass = 1;
        at = lineText.length;
        continue;
      }
      if (pass == 1 && found < start.ch) break;
      tokenType = cm.getTokenTypeAt(CodeMirror.Pos(line, found + 1));
      if (!/^(comment|string)/.test(tokenType)) return found + 1;
      at = found - 1;
    }
  }

  var startToken = "{", endToken = "}", startCh = findOpening("{");
  if (startCh == null) {
    startToken = "[", endToken = "]";
    startCh = findOpening("[");
  }

  if (startCh == null) return;
  var count = 1, lastLine = cm.lastLine(), end, endCh;
  outer: for (var i = line; i <= lastLine; ++i) {
    var text = cm.getLine(i), pos = i == line ? startCh : 0;
    for (;;) {
      var nextOpen = text.indexOf(startToken, pos), nextClose = text.indexOf(endToken, pos);
      if (nextOpen < 0) nextOpen = text.length;
      if (nextClose < 0) nextClose = text.length;
      pos = Math.min(nextOpen, nextClose);
      if (pos == text.length) break;
      if (cm.getTokenTypeAt(CodeMirror.Pos(i, pos + 1)) == tokenType) {
        if (pos == nextOpen) ++count;
        else if (!--count) { end = i; endCh = pos; break outer; }
      }
      ++pos;
    }
  }
  if (end == null || line == end) return;
  return {from: CodeMirror.Pos(line, startCh),
          to: CodeMirror.Pos(end, endCh)};
});

CodeMirror.registerHelper("fold", "import", function(cm, start) {
  function hasImport(line) {
    if (line < cm.firstLine() || line > cm.lastLine()) return null;
    var start = cm.getTokenAt(CodeMirror.Pos(line, 1));
    if (!/\S/.test(start.string)) start = cm.getTokenAt(CodeMirror.Pos(line, start.end + 1));
    if (start.type != "keyword" || start.string != "import") return null;
    // Now find closing semicolon, return its position
    for (var i = line, e = Math.min(cm.lastLine(), line + 10); i <= e; ++i) {
      var text = cm.getLine(i), semi = text.indexOf(";");
      if (semi != -1) return {startCh: start.end, end: CodeMirror.Pos(i, semi)};
    }
  }

  var startLine = start.line, has = hasImport(startLine), prev;
  if (!has || hasImport(startLine - 1) || ((prev = hasImport(startLine - 2)) && prev.end.line == startLine - 1))
    return null;
  for (var end = has.end;;) {
    var next = hasImport(end.line + 1);
    if (next == null) break;
    end = next.end;
  }
  return {from: cm.clipPos(CodeMirror.Pos(startLine, has.startCh + 1)), to: end};
});

CodeMirror.registerHelper("fold", "include", function(cm, start) {
  function hasInclude(line) {
    if (line < cm.firstLine() || line > cm.lastLine()) return null;
    var start = cm.getTokenAt(CodeMirror.Pos(line, 1));
    if (!/\S/.test(start.string)) start = cm.getTokenAt(CodeMirror.Pos(line, start.end + 1));
    if (start.type == "meta" && start.string.slice(0, 8) == "#include") return start.start + 8;
  }

  var startLine = start.line, has = hasInclude(startLine);
  if (has == null || hasInclude(startLine - 1) != null) return null;
  for (var end = startLine;;) {
    var next = hasInclude(end + 1);
    if (next == null) break;
    ++end;
  }
  return {from: CodeMirror.Pos(startLine, has + 1),
          to: cm.clipPos(CodeMirror.Pos(end))};
});

});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/fold/xml-fold',["../../CodeMirror"], function(CodeMirror) {
  "use strict";

  var Pos = CodeMirror.Pos;
  function cmp(a, b) { return a.line - b.line || a.ch - b.ch; }

  var nameStartChar = "A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
  var nameChar = nameStartChar + "\-\:\.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
  var xmlTagStart = new RegExp("<(/?)([" + nameStartChar + "][" + nameChar + "]*)", "g");

  function Iter(cm, line, ch, range) {
    this.line = line; this.ch = ch;
    this.cm = cm; this.text = cm.getLine(line);
    this.min = range ? Math.max(range.from, cm.firstLine()) : cm.firstLine();
    this.max = range ? Math.min(range.to - 1, cm.lastLine()) : cm.lastLine();
  }

  function tagAt(iter, ch) {
    var type = iter.cm.getTokenTypeAt(Pos(iter.line, ch));
    return type && /\btag\b/.test(type);
  }

  function nextLine(iter) {
    if (iter.line >= iter.max) return;
    iter.ch = 0;
    iter.text = iter.cm.getLine(++iter.line);
    return true;
  }
  function prevLine(iter) {
    if (iter.line <= iter.min) return;
    iter.text = iter.cm.getLine(--iter.line);
    iter.ch = iter.text.length;
    return true;
  }

  function toTagEnd(iter) {
    for (;;) {
      var gt = iter.text.indexOf(">", iter.ch);
      if (gt == -1) { if (nextLine(iter)) continue; else return; }
      if (!tagAt(iter, gt + 1)) { iter.ch = gt + 1; continue; }
      var lastSlash = iter.text.lastIndexOf("/", gt);
      var selfClose = lastSlash > -1 && !/\S/.test(iter.text.slice(lastSlash + 1, gt));
      iter.ch = gt + 1;
      return selfClose ? "selfClose" : "regular";
    }
  }
  function toTagStart(iter) {
    for (;;) {
      var lt = iter.ch ? iter.text.lastIndexOf("<", iter.ch - 1) : -1;
      if (lt == -1) { if (prevLine(iter)) continue; else return; }
      if (!tagAt(iter, lt + 1)) { iter.ch = lt; continue; }
      xmlTagStart.lastIndex = lt;
      iter.ch = lt;
      var match = xmlTagStart.exec(iter.text);
      if (match && match.index == lt) return match;
    }
  }

  function toNextTag(iter) {
    for (;;) {
      xmlTagStart.lastIndex = iter.ch;
      var found = xmlTagStart.exec(iter.text);
      if (!found) { if (nextLine(iter)) continue; else return; }
      if (!tagAt(iter, found.index + 1)) { iter.ch = found.index + 1; continue; }
      iter.ch = found.index + found[0].length;
      return found;
    }
  }
  function toPrevTag(iter) {
    for (;;) {
      var gt = iter.ch ? iter.text.lastIndexOf(">", iter.ch - 1) : -1;
      if (gt == -1) { if (prevLine(iter)) continue; else return; }
      if (!tagAt(iter, gt + 1)) { iter.ch = gt; continue; }
      var lastSlash = iter.text.lastIndexOf("/", gt);
      var selfClose = lastSlash > -1 && !/\S/.test(iter.text.slice(lastSlash + 1, gt));
      iter.ch = gt + 1;
      return selfClose ? "selfClose" : "regular";
    }
  }

  function findMatchingClose(iter, tag) {
    var stack = [];
    for (;;) {
      var next = toNextTag(iter), end, startLine = iter.line, startCh = iter.ch - (next ? next[0].length : 0);
      if (!next || !(end = toTagEnd(iter))) return;
      if (end == "selfClose") continue;
      if (next[1]) { // closing tag
        for (var i = stack.length - 1; i >= 0; --i) if (stack[i] == next[2]) {
          stack.length = i;
          break;
        }
        if (i < 0 && (!tag || tag == next[2])) return {
          tag: next[2],
          from: Pos(startLine, startCh),
          to: Pos(iter.line, iter.ch)
        };
      } else { // opening tag
        stack.push(next[2]);
      }
    }
  }
  function findMatchingOpen(iter, tag) {
    var stack = [];
    for (;;) {
      var prev = toPrevTag(iter);
      if (!prev) return;
      if (prev == "selfClose") { toTagStart(iter); continue; }
      var endLine = iter.line, endCh = iter.ch;
      var start = toTagStart(iter);
      if (!start) return;
      if (start[1]) { // closing tag
        stack.push(start[2]);
      } else { // opening tag
        for (var i = stack.length - 1; i >= 0; --i) if (stack[i] == start[2]) {
          stack.length = i;
          break;
        }
        if (i < 0 && (!tag || tag == start[2])) return {
          tag: start[2],
          from: Pos(iter.line, iter.ch),
          to: Pos(endLine, endCh)
        };
      }
    }
  }

  CodeMirror.registerHelper("fold", "xml", function(cm, start) {
    var iter = new Iter(cm, start.line, 0);
    for (;;) {
      var openTag = toNextTag(iter)
      if (!openTag || iter.line != start.line) return
      var end = toTagEnd(iter)
      if (!end) return
      if (!openTag[1] && end != "selfClose") {
        var startPos = Pos(iter.line, iter.ch);
        var endPos = findMatchingClose(iter, openTag[2]);
        return endPos && cmp(endPos.from, startPos) > 0 ? {from: startPos, to: endPos.from} : null
      }
    }
  });
  CodeMirror.findMatchingTag = function(cm, pos, range) {
    var iter = new Iter(cm, pos.line, pos.ch, range);
    if (iter.text.indexOf(">") == -1 && iter.text.indexOf("<") == -1) return;
    var end = toTagEnd(iter), to = end && Pos(iter.line, iter.ch);
    var start = end && toTagStart(iter);
    if (!end || !start || cmp(iter, pos) > 0) return;
    var here = {from: Pos(iter.line, iter.ch), to: to, tag: start[2]};
    if (end == "selfClose") return {open: here, close: null, at: "open"};

    if (start[1]) { // closing tag
      return {open: findMatchingOpen(iter, start[2]), close: here, at: "close"};
    } else { // opening tag
      iter = new Iter(cm, to.line, to.ch, range);
      return {open: here, close: findMatchingClose(iter, start[2]), at: "open"};
    }
  };

  CodeMirror.findEnclosingTag = function(cm, pos, range, tag) {
    var iter = new Iter(cm, pos.line, pos.ch, range);
    for (;;) {
      var open = findMatchingOpen(iter, tag);
      if (!open) break;
      var forward = new Iter(cm, pos.line, pos.ch, range);
      var close = findMatchingClose(forward, open.tag);
      if (close) return {open: open, close: close};
    }
  };

  // Used by addon/edit/closetag.js
  CodeMirror.scanForClosingTag = function(cm, pos, name, end) {
    var iter = new Iter(cm, pos.line, pos.ch, end ? {from: 0, to: end} : null);
    return findMatchingClose(iter, name);
  };
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/fold/indent-fold',["../../CodeMirror"], function(CodeMirror) {
"use strict";

function lineIndent(cm, lineNo) {
  var text = cm.getLine(lineNo)
  var spaceTo = text.search(/\S/)
  if (spaceTo == -1 || /\bcomment\b/.test(cm.getTokenTypeAt(CodeMirror.Pos(lineNo, spaceTo + 1))))
    return -1
  return CodeMirror.countColumn(text, null, cm.getOption("tabSize"))
}

CodeMirror.registerHelper("fold", "indent", function(cm, start) {
  var myIndent = lineIndent(cm, start.line)
  if (myIndent < 0) return
  var lastLineInFold = null

  // Go through lines until we find a line that definitely doesn't belong in
  // the block we're folding, or to the end.
  for (var i = start.line + 1, end = cm.lastLine(); i <= end; ++i) {
    var indent = lineIndent(cm, i)
    if (indent == -1) {
    } else if (indent > myIndent) {
      // Lines with a greater indent are considered part of the block.
      lastLineInFold = i;
    } else {
      // If this line has non-space, non-comment content, and is
      // indented less or equal to the start line, it is the start of
      // another block.
      break;
    }
  }
  if (lastLineInFold) return {
    from: CodeMirror.Pos(start.line, cm.getLine(start.line).length),
    to: CodeMirror.Pos(lastLineInFold, cm.getLine(lastLineInFold).length)
  };
});

});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/fold/markdown-fold',["../../CodeMirror"], function(CodeMirror) {
"use strict";

CodeMirror.registerHelper("fold", "markdown", function(cm, start) {
  var maxDepth = 100;

  function isHeader(lineNo) {
    var tokentype = cm.getTokenTypeAt(CodeMirror.Pos(lineNo, 0));
    return tokentype && /\bheader\b/.test(tokentype);
  }

  function headerLevel(lineNo, line, nextLine) {
    var match = line && line.match(/^#+/);
    if (match && isHeader(lineNo)) return match[0].length;
    match = nextLine && nextLine.match(/^[=\-]+\s*$/);
    if (match && isHeader(lineNo + 1)) return nextLine[0] == "=" ? 1 : 2;
    return maxDepth;
  }

  var firstLine = cm.getLine(start.line), nextLine = cm.getLine(start.line + 1);
  var level = headerLevel(start.line, firstLine, nextLine);
  if (level === maxDepth) return undefined;

  var lastLineNo = cm.lastLine();
  var end = start.line, nextNextLine = cm.getLine(end + 2);
  while (end < lastLineNo) {
    if (headerLevel(end + 1, nextLine, nextNextLine) <= level) break;
    ++end;
    nextLine = nextNextLine;
    nextNextLine = cm.getLine(end + 2);
  }

  return {
    from: CodeMirror.Pos(start.line, firstLine.length),
    to: CodeMirror.Pos(end, cm.getLine(end).length)
  };
});

});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/fold/comment-fold',["../../CodeMirror"], function(CodeMirror) {
"use strict";

CodeMirror.registerGlobalHelper("fold", "comment", function(mode) {
  return mode.blockCommentStart && mode.blockCommentEnd;
}, function(cm, start) {
  var mode = cm.getModeAt(start), startToken = mode.blockCommentStart, endToken = mode.blockCommentEnd;
  if (!startToken || !endToken) return;
  var line = start.line, lineText = cm.getLine(line);

  var startCh;
  for (var at = start.ch, pass = 0;;) {
    var found = at <= 0 ? -1 : lineText.lastIndexOf(startToken, at - 1);
    if (found == -1) {
      if (pass == 1) return;
      pass = 1;
      at = lineText.length;
      continue;
    }
    if (pass == 1 && found < start.ch) return;
    if (/comment/.test(cm.getTokenTypeAt(CodeMirror.Pos(line, found + 1))) &&
        (found == 0 || lineText.slice(found - endToken.length, found) == endToken ||
         !/comment/.test(cm.getTokenTypeAt(CodeMirror.Pos(line, found))))) {
      startCh = found + startToken.length;
      break;
    }
    at = found - 1;
  }

  var depth = 1, lastLine = cm.lastLine(), end, endCh;
  outer: for (var i = line; i <= lastLine; ++i) {
    var text = cm.getLine(i), pos = i == line ? startCh : 0;
    for (;;) {
      var nextOpen = text.indexOf(startToken, pos), nextClose = text.indexOf(endToken, pos);
      if (nextOpen < 0) nextOpen = text.length;
      if (nextClose < 0) nextClose = text.length;
      pos = Math.min(nextOpen, nextClose);
      if (pos == text.length) break;
      if (pos == nextOpen) ++depth;
      else if (!--depth) { end = i; endCh = pos; break outer; }
      ++pos;
    }
  }
  if (end == null || line == end && endCh == startCh) return;
  return {from: CodeMirror.Pos(line, startCh),
          to: CodeMirror.Pos(end, endCh)};
});

});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/edit/matchbrackets',["../../CodeMirror"], function(CodeMirror) {
  var ie_lt8 = /MSIE \d/.test(navigator.userAgent) &&
    (document.documentMode == null || document.documentMode < 8);

  var Pos = CodeMirror.Pos;

  var matching = {"(": ")>", ")": "(<", "[": "]>", "]": "[<", "{": "}>", "}": "{<", "<": ">>", ">": "<<"};

  function bracketRegex(config) {
    return config && config.bracketRegex || /[(){}[\]]/
  }

  function findMatchingBracket(cm, where, config) {
    var line = cm.getLineHandle(where.line), pos = where.ch - 1;
    var afterCursor = config && config.afterCursor
    if (afterCursor == null)
      afterCursor = /(^| )cm-fat-cursor($| )/.test(cm.getWrapperElement().className)
    var re = bracketRegex(config)

    // A cursor is defined as between two characters, but in in vim command mode
    // (i.e. not insert mode), the cursor is visually represented as a
    // highlighted box on top of the 2nd character. Otherwise, we allow matches
    // from before or after the cursor.
    var match = (!afterCursor && pos >= 0 && re.test(line.text.charAt(pos)) && matching[line.text.charAt(pos)]) ||
        re.test(line.text.charAt(pos + 1)) && matching[line.text.charAt(++pos)];
    if (!match) return null;
    var dir = match.charAt(1) == ">" ? 1 : -1;
    if (config && config.strict && (dir > 0) != (pos == where.ch)) return null;
    var style = cm.getTokenTypeAt(Pos(where.line, pos + 1));

    var found = scanForBracket(cm, Pos(where.line, pos + (dir > 0 ? 1 : 0)), dir, style || null, config);
    if (found == null) return null;
    return {from: Pos(where.line, pos), to: found && found.pos,
            match: found && found.ch == match.charAt(0), forward: dir > 0};
  }

  // bracketRegex is used to specify which type of bracket to scan
  // should be a regexp, e.g. /[[\]]/
  //
  // Note: If "where" is on an open bracket, then this bracket is ignored.
  //
  // Returns false when no bracket was found, null when it reached
  // maxScanLines and gave up
  function scanForBracket(cm, where, dir, style, config) {
    var maxScanLen = (config && config.maxScanLineLength) || 10000;
    var maxScanLines = (config && config.maxScanLines) || 1000;

    var stack = [];
    var re = bracketRegex(config)
    var lineEnd = dir > 0 ? Math.min(where.line + maxScanLines, cm.lastLine() + 1)
                          : Math.max(cm.firstLine() - 1, where.line - maxScanLines);
    for (var lineNo = where.line; lineNo != lineEnd; lineNo += dir) {
      var line = cm.getLine(lineNo);
      if (!line) continue;
      var pos = dir > 0 ? 0 : line.length - 1, end = dir > 0 ? line.length : -1;
      if (line.length > maxScanLen) continue;
      if (lineNo == where.line) pos = where.ch - (dir < 0 ? 1 : 0);
      for (; pos != end; pos += dir) {
        var ch = line.charAt(pos);
        if (re.test(ch) && (style === undefined || cm.getTokenTypeAt(Pos(lineNo, pos + 1)) == style)) {
          var match = matching[ch];
          if (match && (match.charAt(1) == ">") == (dir > 0)) stack.push(ch);
          else if (!stack.length) return {pos: Pos(lineNo, pos), ch: ch};
          else stack.pop();
        }
      }
    }
    return lineNo - dir == (dir > 0 ? cm.lastLine() : cm.firstLine()) ? false : null;
  }

  function matchBrackets(cm, autoclear, config) {
    // Disable brace matching in long lines, since it'll cause hugely slow updates
    var maxHighlightLen = cm.state.matchBrackets.maxHighlightLineLength || 1000;
    var marks = [], ranges = cm.listSelections();
    for (var i = 0; i < ranges.length; i++) {
      var match = ranges[i].empty() && findMatchingBracket(cm, ranges[i].head, config);
      if (match && cm.getLine(match.from.line).length <= maxHighlightLen) {
        var style = match.match ? "CodeMirror-matchingbracket" : "CodeMirror-nonmatchingbracket";
        marks.push(cm.markText(match.from, Pos(match.from.line, match.from.ch + 1), {className: style}));
        if (match.to && cm.getLine(match.to.line).length <= maxHighlightLen)
          marks.push(cm.markText(match.to, Pos(match.to.line, match.to.ch + 1), {className: style}));
      }
    }

    if (marks.length) {
      // Kludge to work around the IE bug from issue #1193, where text
      // input stops going to the textare whever this fires.
      if (ie_lt8 && cm.state.focused) cm.focus();

      var clear = function() {
        cm.operation(function() {
          for (var i = 0; i < marks.length; i++) marks[i].clear();
        });
      };
      if (autoclear) setTimeout(clear, 800);
      else return clear;
    }
  }

  function doMatchBrackets(cm) {
    cm.operation(function() {
      if (cm.state.matchBrackets.currentlyHighlighted) {
        cm.state.matchBrackets.currentlyHighlighted();
        cm.state.matchBrackets.currentlyHighlighted = null;
      }
      cm.state.matchBrackets.currentlyHighlighted = matchBrackets(cm, false, cm.state.matchBrackets);
    });
  }

  CodeMirror.defineOption("matchBrackets", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init) {
      cm.off("cursorActivity", doMatchBrackets);
      if (cm.state.matchBrackets && cm.state.matchBrackets.currentlyHighlighted) {
        cm.state.matchBrackets.currentlyHighlighted();
        cm.state.matchBrackets.currentlyHighlighted = null;
      }
    }
    if (val) {
      cm.state.matchBrackets = typeof val == "object" ? val : {};
      cm.on("cursorActivity", doMatchBrackets);
    }
  });

  CodeMirror.defineExtension("matchBrackets", function() {matchBrackets(this, true);});
  CodeMirror.defineExtension("findMatchingBracket", function(pos, config, oldConfig){
    // Backwards-compatibility kludge
    if (oldConfig || typeof config == "boolean") {
      if (!oldConfig) {
        config = config ? {strict: true} : null
      } else {
        oldConfig.strict = config
        config = oldConfig
      }
    }
    return findMatchingBracket(this, pos, config)
  });
  CodeMirror.defineExtension("scanForBracket", function(pos, dir, style, config){
    return scanForBracket(this, pos, dir, style, config);
  });
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/edit/closebrackets',["../../CodeMirror"], function(CodeMirror) {
  var defaults = {
    pairs: "()[]{}''\"\"",
    closeBefore: ")]}'\":;>",
    triples: "",
    explode: "[]{}"
  };

  var Pos = CodeMirror.Pos;

  CodeMirror.defineOption("autoCloseBrackets", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init) {
      cm.removeKeyMap(keyMap);
      cm.state.closeBrackets = null;
    }
    if (val) {
      ensureBound(getOption(val, "pairs"))
      cm.state.closeBrackets = val;
      cm.addKeyMap(keyMap);
    }
  });

  function getOption(conf, name) {
    if (name == "pairs" && typeof conf == "string") return conf;
    if (typeof conf == "object" && conf[name] != null) return conf[name];
    return defaults[name];
  }

  var keyMap = {Backspace: handleBackspace, Enter: handleEnter};
  function ensureBound(chars) {
    for (var i = 0; i < chars.length; i++) {
      var ch = chars.charAt(i), key = "'" + ch + "'"
      if (!keyMap[key]) keyMap[key] = handler(ch)
    }
  }
  ensureBound(defaults.pairs + "`")

  function handler(ch) {
    return function(cm) { return handleChar(cm, ch); };
  }

  function getConfig(cm) {
    var deflt = cm.state.closeBrackets;
    if (!deflt || deflt.override) return deflt;
    var mode = cm.getModeAt(cm.getCursor());
    return mode.closeBrackets || deflt;
  }

  function handleBackspace(cm) {
    var conf = getConfig(cm);
    if (!conf || cm.getOption("disableInput")) return CodeMirror.Pass;

    var pairs = getOption(conf, "pairs");
    var ranges = cm.listSelections();
    for (var i = 0; i < ranges.length; i++) {
      if (!ranges[i].empty()) return CodeMirror.Pass;
      var around = charsAround(cm, ranges[i].head);
      if (!around || pairs.indexOf(around) % 2 != 0) return CodeMirror.Pass;
    }
    for (var i = ranges.length - 1; i >= 0; i--) {
      var cur = ranges[i].head;
      cm.replaceRange("", Pos(cur.line, cur.ch - 1), Pos(cur.line, cur.ch + 1), "+delete");
    }
  }

  function handleEnter(cm) {
    var conf = getConfig(cm);
    var explode = conf && getOption(conf, "explode");
    if (!explode || cm.getOption("disableInput")) return CodeMirror.Pass;

    var ranges = cm.listSelections();
    for (var i = 0; i < ranges.length; i++) {
      if (!ranges[i].empty()) return CodeMirror.Pass;
      var around = charsAround(cm, ranges[i].head);
      if (!around || explode.indexOf(around) % 2 != 0) return CodeMirror.Pass;
    }
    cm.operation(function() {
      var linesep = cm.lineSeparator() || "\n";
      cm.replaceSelection(linesep + linesep, null);
      cm.execCommand("goCharLeft");
      ranges = cm.listSelections();
      for (var i = 0; i < ranges.length; i++) {
        var line = ranges[i].head.line;
        cm.indentLine(line, null, true);
        cm.indentLine(line + 1, null, true);
      }
    });
  }

  function contractSelection(sel) {
    var inverted = CodeMirror.cmpPos(sel.anchor, sel.head) > 0;
    return {anchor: new Pos(sel.anchor.line, sel.anchor.ch + (inverted ? -1 : 1)),
            head: new Pos(sel.head.line, sel.head.ch + (inverted ? 1 : -1))};
  }

  function handleChar(cm, ch) {
    var conf = getConfig(cm);
    if (!conf || cm.getOption("disableInput")) return CodeMirror.Pass;

    var pairs = getOption(conf, "pairs");
    var pos = pairs.indexOf(ch);
    if (pos == -1) return CodeMirror.Pass;

    var closeBefore = getOption(conf,"closeBefore");

    var triples = getOption(conf, "triples");

    var identical = pairs.charAt(pos + 1) == ch;
    var ranges = cm.listSelections();
    var opening = pos % 2 == 0;

    var type;
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i], cur = range.head, curType;
      var next = cm.getRange(cur, Pos(cur.line, cur.ch + 1));
      if (opening && !range.empty()) {
        curType = "surround";
      } else if ((identical || !opening) && next == ch) {
        if (identical && stringStartsAfter(cm, cur))
          curType = "both";
        else if (triples.indexOf(ch) >= 0 && cm.getRange(cur, Pos(cur.line, cur.ch + 3)) == ch + ch + ch)
          curType = "skipThree";
        else
          curType = "skip";
      } else if (identical && cur.ch > 1 && triples.indexOf(ch) >= 0 &&
                 cm.getRange(Pos(cur.line, cur.ch - 2), cur) == ch + ch) {
        if (cur.ch > 2 && /\bstring/.test(cm.getTokenTypeAt(Pos(cur.line, cur.ch - 2)))) return CodeMirror.Pass;
        curType = "addFour";
      } else if (identical) {
        var prev = cur.ch == 0 ? " " : cm.getRange(Pos(cur.line, cur.ch - 1), cur)
        if (!CodeMirror.isWordChar(next) && prev != ch && !CodeMirror.isWordChar(prev)) curType = "both";
        else return CodeMirror.Pass;
      } else if (opening && (next.length === 0 || /\s/.test(next) || closeBefore.indexOf(next) > -1)) {
        curType = "both";
      } else {
        return CodeMirror.Pass;
      }
      if (!type) type = curType;
      else if (type != curType) return CodeMirror.Pass;
    }

    var left = pos % 2 ? pairs.charAt(pos - 1) : ch;
    var right = pos % 2 ? ch : pairs.charAt(pos + 1);
    cm.operation(function() {
      if (type == "skip") {
        cm.execCommand("goCharRight");
      } else if (type == "skipThree") {
        for (var i = 0; i < 3; i++)
          cm.execCommand("goCharRight");
      } else if (type == "surround") {
        var sels = cm.getSelections();
        for (var i = 0; i < sels.length; i++)
          sels[i] = left + sels[i] + right;
        cm.replaceSelections(sels, "around");
        sels = cm.listSelections().slice();
        for (var i = 0; i < sels.length; i++)
          sels[i] = contractSelection(sels[i]);
        cm.setSelections(sels);
      } else if (type == "both") {
        cm.replaceSelection(left + right, null);
        cm.triggerElectric(left + right);
        cm.execCommand("goCharLeft");
      } else if (type == "addFour") {
        cm.replaceSelection(left + left + left + left, "before");
        cm.execCommand("goCharRight");
      }
    });
  }

  function charsAround(cm, pos) {
    var str = cm.getRange(Pos(pos.line, pos.ch - 1),
                          Pos(pos.line, pos.ch + 1));
    return str.length == 2 ? str : null;
  }

  function stringStartsAfter(cm, pos) {
    var token = cm.getTokenAt(Pos(pos.line, pos.ch + 1))
    return /\bstring/.test(token.type) && token.start == pos.ch &&
      (pos.ch == 0 || !/\bstring/.test(cm.getTokenTypeAt(pos)))
  }
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/edit/trailingspace',["../../CodeMirror"], function(CodeMirror) {
  CodeMirror.defineOption("showTrailingSpace", false, function(cm, val, prev) {
    if (prev == CodeMirror.Init) prev = false;
    if (prev && !val)
      cm.removeOverlay("trailingspace");
    else if (!prev && val)
      cm.addOverlay({
        token: function(stream) {
          for (var l = stream.string.length, i = l; i && /\s/.test(stream.string.charAt(i - 1)); --i) {}
          if (i > stream.pos) { stream.pos = i; return null; }
          stream.pos = l;
          return "trailingspace";
        },
        name: "trailingspace"
      });
  });
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/search/searchcursor',["../../CodeMirror"],function(CodeMirror) {
  "use strict"
  var Pos = CodeMirror.Pos

  function regexpFlags(regexp) {
    var flags = regexp.flags
    return flags != null ? flags : (regexp.ignoreCase ? "i" : "")
      + (regexp.global ? "g" : "")
      + (regexp.multiline ? "m" : "")
  }

  function ensureFlags(regexp, flags) {
    var current = regexpFlags(regexp), target = current
    for (var i = 0; i < flags.length; i++) if (target.indexOf(flags.charAt(i)) == -1)
      target += flags.charAt(i)
    return current == target ? regexp : new RegExp(regexp.source, target)
  }

  function maybeMultiline(regexp) {
    return /\\s|\\n|\n|\\W|\\D|\[\^/.test(regexp.source)
  }

  function searchRegexpForward(doc, regexp, start) {
    regexp = ensureFlags(regexp, "g")
    for (var line = start.line, ch = start.ch, last = doc.lastLine(); line <= last; line++, ch = 0) {
      regexp.lastIndex = ch
      var string = doc.getLine(line), match = regexp.exec(string)
      if (match)
        return {from: Pos(line, match.index),
                to: Pos(line, match.index + match[0].length),
                match: match}
    }
  }

  function searchRegexpForwardMultiline(doc, regexp, start) {
    if (!maybeMultiline(regexp)) return searchRegexpForward(doc, regexp, start)

    regexp = ensureFlags(regexp, "gm")
    var string, chunk = 1
    for (var line = start.line, last = doc.lastLine(); line <= last;) {
      // This grows the search buffer in exponentially-sized chunks
      // between matches, so that nearby matches are fast and don't
      // require concatenating the whole document (in case we're
      // searching for something that has tons of matches), but at the
      // same time, the amount of retries is limited.
      for (var i = 0; i < chunk; i++) {
        if (line > last) break
        var curLine = doc.getLine(line++)
        string = string == null ? curLine : string + "\n" + curLine
      }
      chunk = chunk * 2
      regexp.lastIndex = start.ch
      var match = regexp.exec(string)
      if (match) {
        var before = string.slice(0, match.index).split("\n"), inside = match[0].split("\n")
        var startLine = start.line + before.length - 1, startCh = before[before.length - 1].length
        return {from: Pos(startLine, startCh),
                to: Pos(startLine + inside.length - 1,
                        inside.length == 1 ? startCh + inside[0].length : inside[inside.length - 1].length),
                match: match}
      }
    }
  }

  function lastMatchIn(string, regexp) {
    var cutOff = 0, match
    for (;;) {
      regexp.lastIndex = cutOff
      var newMatch = regexp.exec(string)
      if (!newMatch) return match
      match = newMatch
      cutOff = match.index + (match[0].length || 1)
      if (cutOff == string.length) return match
    }
  }

  function searchRegexpBackward(doc, regexp, start) {
    regexp = ensureFlags(regexp, "g")
    for (var line = start.line, ch = start.ch, first = doc.firstLine(); line >= first; line--, ch = -1) {
      var string = doc.getLine(line)
      if (ch > -1) string = string.slice(0, ch)
      var match = lastMatchIn(string, regexp)
      if (match)
        return {from: Pos(line, match.index),
                to: Pos(line, match.index + match[0].length),
                match: match}
    }
  }

  function searchRegexpBackwardMultiline(doc, regexp, start) {
    regexp = ensureFlags(regexp, "gm")
    var string, chunk = 1
    for (var line = start.line, first = doc.firstLine(); line >= first;) {
      for (var i = 0; i < chunk; i++) {
        var curLine = doc.getLine(line--)
        string = string == null ? curLine.slice(0, start.ch) : curLine + "\n" + string
      }
      chunk *= 2

      var match = lastMatchIn(string, regexp)
      if (match) {
        var before = string.slice(0, match.index).split("\n"), inside = match[0].split("\n")
        var startLine = line + before.length, startCh = before[before.length - 1].length
        return {from: Pos(startLine, startCh),
                to: Pos(startLine + inside.length - 1,
                        inside.length == 1 ? startCh + inside[0].length : inside[inside.length - 1].length),
                match: match}
      }
    }
  }

  var doFold, noFold
  if (String.prototype.normalize) {
    doFold = function(str) { return str.normalize("NFD").toLowerCase() }
    noFold = function(str) { return str.normalize("NFD") }
  } else {
    doFold = function(str) { return str.toLowerCase() }
    noFold = function(str) { return str }
  }

  // Maps a position in a case-folded line back to a position in the original line
  // (compensating for codepoints increasing in number during folding)
  function adjustPos(orig, folded, pos, foldFunc) {
    if (orig.length == folded.length) return pos
    for (var min = 0, max = pos + Math.max(0, orig.length - folded.length);;) {
      if (min == max) return min
      var mid = (min + max) >> 1
      var len = foldFunc(orig.slice(0, mid)).length
      if (len == pos) return mid
      else if (len > pos) max = mid
      else min = mid + 1
    }
  }

  function searchStringForward(doc, query, start, caseFold) {
    // Empty string would match anything and never progress, so we
    // define it to match nothing instead.
    if (!query.length) return null
    var fold = caseFold ? doFold : noFold
    var lines = fold(query).split(/\r|\n\r?/)

    search: for (var line = start.line, ch = start.ch, last = doc.lastLine() + 1 - lines.length; line <= last; line++, ch = 0) {
      var orig = doc.getLine(line).slice(ch), string = fold(orig)
      if (lines.length == 1) {
        var found = string.indexOf(lines[0])
        if (found == -1) continue search
        var start = adjustPos(orig, string, found, fold) + ch
        return {from: Pos(line, adjustPos(orig, string, found, fold) + ch),
                to: Pos(line, adjustPos(orig, string, found + lines[0].length, fold) + ch)}
      } else {
        var cutFrom = string.length - lines[0].length
        if (string.slice(cutFrom) != lines[0]) continue search
        for (var i = 1; i < lines.length - 1; i++)
          if (fold(doc.getLine(line + i)) != lines[i]) continue search
        var end = doc.getLine(line + lines.length - 1), endString = fold(end), lastLine = lines[lines.length - 1]
        if (endString.slice(0, lastLine.length) != lastLine) continue search
        return {from: Pos(line, adjustPos(orig, string, cutFrom, fold) + ch),
                to: Pos(line + lines.length - 1, adjustPos(end, endString, lastLine.length, fold))}
      }
    }
  }

  function searchStringBackward(doc, query, start, caseFold) {
    if (!query.length) return null
    var fold = caseFold ? doFold : noFold
    var lines = fold(query).split(/\r|\n\r?/)

    search: for (var line = start.line, ch = start.ch, first = doc.firstLine() - 1 + lines.length; line >= first; line--, ch = -1) {
      var orig = doc.getLine(line)
      if (ch > -1) orig = orig.slice(0, ch)
      var string = fold(orig)
      if (lines.length == 1) {
        var found = string.lastIndexOf(lines[0])
        if (found == -1) continue search
        return {from: Pos(line, adjustPos(orig, string, found, fold)),
                to: Pos(line, adjustPos(orig, string, found + lines[0].length, fold))}
      } else {
        var lastLine = lines[lines.length - 1]
        if (string.slice(0, lastLine.length) != lastLine) continue search
        for (var i = 1, start = line - lines.length + 1; i < lines.length - 1; i++)
          if (fold(doc.getLine(start + i)) != lines[i]) continue search
        var top = doc.getLine(line + 1 - lines.length), topString = fold(top)
        if (topString.slice(topString.length - lines[0].length) != lines[0]) continue search
        return {from: Pos(line + 1 - lines.length, adjustPos(top, topString, top.length - lines[0].length, fold)),
                to: Pos(line, adjustPos(orig, string, lastLine.length, fold))}
      }
    }
  }

  function SearchCursor(doc, query, pos, options) {
    this.atOccurrence = false
    this.doc = doc
    pos = pos ? doc.clipPos(pos) : Pos(0, 0)
    this.pos = {from: pos, to: pos}

    var caseFold
    if (typeof options == "object") {
      caseFold = options.caseFold
    } else { // Backwards compat for when caseFold was the 4th argument
      caseFold = options
      options = null
    }

    if (typeof query == "string") {
      if (caseFold == null) caseFold = false
      this.matches = function(reverse, pos) {
        return (reverse ? searchStringBackward : searchStringForward)(doc, query, pos, caseFold)
      }
    } else {
      query = ensureFlags(query, "gm")
      if (!options || options.multiline !== false)
        this.matches = function(reverse, pos) {
          return (reverse ? searchRegexpBackwardMultiline : searchRegexpForwardMultiline)(doc, query, pos)
        }
      else
        this.matches = function(reverse, pos) {
          return (reverse ? searchRegexpBackward : searchRegexpForward)(doc, query, pos)
        }
    }
  }

  SearchCursor.prototype = {
    findNext: function() {return this.find(false)},
    findPrevious: function() {return this.find(true)},

    find: function(reverse) {
      var result = this.matches(reverse, this.doc.clipPos(reverse ? this.pos.from : this.pos.to))

      // Implements weird auto-growing behavior on null-matches for
      // backwards-compatiblity with the vim code (unfortunately)
      while (result && CodeMirror.cmpPos(result.from, result.to) == 0) {
        if (reverse) {
          if (result.from.ch) result.from = Pos(result.from.line, result.from.ch - 1)
          else if (result.from.line == this.doc.firstLine()) result = null
          else result = this.matches(reverse, this.doc.clipPos(Pos(result.from.line - 1)))
        } else {
          if (result.to.ch < this.doc.getLine(result.to.line).length) result.to = Pos(result.to.line, result.to.ch + 1)
          else if (result.to.line == this.doc.lastLine()) result = null
          else result = this.matches(reverse, Pos(result.to.line + 1, 0))
        }
      }

      if (result) {
        this.pos = result
        this.atOccurrence = true
        return this.pos.match || true
      } else {
        var end = Pos(reverse ? this.doc.firstLine() : this.doc.lastLine() + 1, 0)
        this.pos = {from: end, to: end}
        return this.atOccurrence = false
      }
    },

    from: function() {if (this.atOccurrence) return this.pos.from},
    to: function() {if (this.atOccurrence) return this.pos.to},

    replace: function(newText, origin) {
      if (!this.atOccurrence) return
      var lines = CodeMirror.splitLines(newText)
      this.doc.replaceRange(lines, this.pos.from, this.pos.to, origin)
      this.pos.to = Pos(this.pos.from.line + lines.length - 1,
                        lines[lines.length - 1].length + (lines.length == 1 ? this.pos.from.ch : 0))
    }
  }

  CodeMirror.defineExtension("getSearchCursor", function(query, pos, caseFold) {
    return new SearchCursor(this.doc, query, pos, caseFold)
  })
  CodeMirror.defineDocExtension("getSearchCursor", function(query, pos, caseFold) {
    return new SearchCursor(this, query, pos, caseFold)
  })

  CodeMirror.defineExtension("selectMatches", function(query, caseFold) {
    var ranges = []
    var cur = this.getSearchCursor(query, this.getCursor("from"), caseFold)
    while (cur.findNext()) {
      if (CodeMirror.cmpPos(cur.to(), this.getCursor("to")) > 0) break
      ranges.push({anchor: cur.from(), head: cur.to()})
    }
    if (ranges.length)
      this.setSelections(ranges, 0)
  })
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

// Open simple dialogs on top of an editor. Relies on dialog.css.

define('skylark-codemirror/addon/dialog/dialog',["../../CodeMirror"], function(CodeMirror) {
  function dialogDiv(cm, template, bottom) {
    var wrap = cm.getWrapperElement();
    var dialog;
    dialog = wrap.appendChild(document.createElement("div"));
    if (bottom)
      dialog.className = "CodeMirror-dialog CodeMirror-dialog-bottom";
    else
      dialog.className = "CodeMirror-dialog CodeMirror-dialog-top";

    if (typeof template == "string") {
      dialog.innerHTML = template;
    } else { // Assuming it's a detached DOM element.
      dialog.appendChild(template);
    }
    CodeMirror.addClass(wrap, 'dialog-opened');
    return dialog;
  }

  function closeNotification(cm, newVal) {
    if (cm.state.currentNotificationClose)
      cm.state.currentNotificationClose();
    cm.state.currentNotificationClose = newVal;
  }

  CodeMirror.defineExtension("openDialog", function(template, callback, options) {
    if (!options) options = {};

    closeNotification(this, null);

    var dialog = dialogDiv(this, template, options.bottom);
    var closed = false, me = this;
    function close(newVal) {
      if (typeof newVal == 'string') {
        inp.value = newVal;
      } else {
        if (closed) return;
        closed = true;
        CodeMirror.rmClass(dialog.parentNode, 'dialog-opened');
        dialog.parentNode.removeChild(dialog);
        me.focus();

        if (options.onClose) options.onClose(dialog);
      }
    }

    var inp = dialog.getElementsByTagName("input")[0], button;
    if (inp) {
      inp.focus();

      if (options.value) {
        inp.value = options.value;
        if (options.selectValueOnOpen !== false) {
          inp.select();
        }
      }

      if (options.onInput)
        CodeMirror.on(inp, "input", function(e) { options.onInput(e, inp.value, close);});
      if (options.onKeyUp)
        CodeMirror.on(inp, "keyup", function(e) {options.onKeyUp(e, inp.value, close);});

      CodeMirror.on(inp, "keydown", function(e) {
        if (options && options.onKeyDown && options.onKeyDown(e, inp.value, close)) { return; }
        if (e.keyCode == 27 || (options.closeOnEnter !== false && e.keyCode == 13)) {
          inp.blur();
          CodeMirror.e_stop(e);
          close();
        }
        if (e.keyCode == 13) callback(inp.value, e);
      });

      if (options.closeOnBlur !== false) CodeMirror.on(inp, "blur", close);
    } else if (button = dialog.getElementsByTagName("button")[0]) {
      CodeMirror.on(button, "click", function() {
        close();
        me.focus();
      });

      if (options.closeOnBlur !== false) CodeMirror.on(button, "blur", close);

      button.focus();
    }
    return close;
  });

  CodeMirror.defineExtension("openConfirm", function(template, callbacks, options) {
    closeNotification(this, null);
    var dialog = dialogDiv(this, template, options && options.bottom);
    var buttons = dialog.getElementsByTagName("button");
    var closed = false, me = this, blurring = 1;
    function close() {
      if (closed) return;
      closed = true;
      CodeMirror.rmClass(dialog.parentNode, 'dialog-opened');
      dialog.parentNode.removeChild(dialog);
      me.focus();
    }
    buttons[0].focus();
    for (var i = 0; i < buttons.length; ++i) {
      var b = buttons[i];
      (function(callback) {
        CodeMirror.on(b, "click", function(e) {
          CodeMirror.e_preventDefault(e);
          close();
          if (callback) callback(me);
        });
      })(callbacks[i]);
      CodeMirror.on(b, "blur", function() {
        --blurring;
        setTimeout(function() { if (blurring <= 0) close(); }, 200);
      });
      CodeMirror.on(b, "focus", function() { ++blurring; });
    }
  });

  /*
   * openNotification
   * Opens a notification, that can be closed with an optional timer
   * (default 5000ms timer) and always closes on click.
   *
   * If a notification is opened while another is opened, it will close the
   * currently opened one and open the new one immediately.
   */
  CodeMirror.defineExtension("openNotification", function(template, options) {
    closeNotification(this, close);
    var dialog = dialogDiv(this, template, options && options.bottom);
    var closed = false, doneTimer;
    var duration = options && typeof options.duration !== "undefined" ? options.duration : 5000;

    function close() {
      if (closed) return;
      closed = true;
      clearTimeout(doneTimer);
      CodeMirror.rmClass(dialog.parentNode, 'dialog-opened');
      dialog.parentNode.removeChild(dialog);
    }

    CodeMirror.on(dialog, 'click', function(e) {
      CodeMirror.e_preventDefault(e);
      close();
    });

    if (duration)
      doneTimer = setTimeout(close, duration);

    return close;
  });
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

// Define search commands. Depends on dialog.js or another
// implementation of the openDialog method.

// Replace works a little oddly -- it will do the replace on the next
// Ctrl-G (or whatever is bound to findNext) press. You prevent a
// replace by making sure the match is no longer selected when hitting
// Ctrl-G.

define('skylark-codemirror/addon/search/search',["../../CodeMirror", "./searchcursor", "../dialog/dialog"],function(CodeMirror) {
  "use strict";

  function searchOverlay(query, caseInsensitive) {
    if (typeof query == "string")
      query = new RegExp(query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), caseInsensitive ? "gi" : "g");
    else if (!query.global)
      query = new RegExp(query.source, query.ignoreCase ? "gi" : "g");

    return {token: function(stream) {
      query.lastIndex = stream.pos;
      var match = query.exec(stream.string);
      if (match && match.index == stream.pos) {
        stream.pos += match[0].length || 1;
        return "searching";
      } else if (match) {
        stream.pos = match.index;
      } else {
        stream.skipToEnd();
      }
    }};
  }

  function SearchState() {
    this.posFrom = this.posTo = this.lastQuery = this.query = null;
    this.overlay = null;
  }

  function getSearchState(cm) {
    return cm.state.search || (cm.state.search = new SearchState());
  }

  function queryCaseInsensitive(query) {
    return typeof query == "string" && query == query.toLowerCase();
  }

  function getSearchCursor(cm, query, pos) {
    // Heuristic: if the query string is all lowercase, do a case insensitive search.
    return cm.getSearchCursor(query, pos, {caseFold: queryCaseInsensitive(query), multiline: true});
  }

  function persistentDialog(cm, text, deflt, onEnter, onKeyDown) {
    cm.openDialog(text, onEnter, {
      value: deflt,
      selectValueOnOpen: true,
      closeOnEnter: false,
      onClose: function() { clearSearch(cm); },
      onKeyDown: onKeyDown
    });
  }

  function dialog(cm, text, shortText, deflt, f) {
    if (cm.openDialog) cm.openDialog(text, f, {value: deflt, selectValueOnOpen: true});
    else f(prompt(shortText, deflt));
  }

  function confirmDialog(cm, text, shortText, fs) {
    if (cm.openConfirm) cm.openConfirm(text, fs);
    else if (confirm(shortText)) fs[0]();
  }

  function parseString(string) {
    return string.replace(/\\(.)/g, function(_, ch) {
      if (ch == "n") return "\n"
      if (ch == "r") return "\r"
      return ch
    })
  }

  function parseQuery(query) {
    var isRE = query.match(/^\/(.*)\/([a-z]*)$/);
    if (isRE) {
      try { query = new RegExp(isRE[1], isRE[2].indexOf("i") == -1 ? "" : "i"); }
      catch(e) {} // Not a regular expression after all, do a string search
    } else {
      query = parseString(query)
    }
    if (typeof query == "string" ? query == "" : query.test(""))
      query = /x^/;
    return query;
  }

  function startSearch(cm, state, query) {
    state.queryText = query;
    state.query = parseQuery(query);
    cm.removeOverlay(state.overlay, queryCaseInsensitive(state.query));
    state.overlay = searchOverlay(state.query, queryCaseInsensitive(state.query));
    cm.addOverlay(state.overlay);
    if (cm.showMatchesOnScrollbar) {
      if (state.annotate) { state.annotate.clear(); state.annotate = null; }
      state.annotate = cm.showMatchesOnScrollbar(state.query, queryCaseInsensitive(state.query));
    }
  }

  function doSearch(cm, rev, persistent, immediate) {
    var state = getSearchState(cm);
    if (state.query) return findNext(cm, rev);
    var q = cm.getSelection() || state.lastQuery;
    if (q instanceof RegExp && q.source == "x^") q = null
    if (persistent && cm.openDialog) {
      var hiding = null
      var searchNext = function(query, event) {
        CodeMirror.e_stop(event);
        if (!query) return;
        if (query != state.queryText) {
          startSearch(cm, state, query);
          state.posFrom = state.posTo = cm.getCursor();
        }
        if (hiding) hiding.style.opacity = 1
        findNext(cm, event.shiftKey, function(_, to) {
          var dialog
          if (to.line < 3 && document.querySelector &&
              (dialog = cm.display.wrapper.querySelector(".CodeMirror-dialog")) &&
              dialog.getBoundingClientRect().bottom - 4 > cm.cursorCoords(to, "window").top)
            (hiding = dialog).style.opacity = .4
        })
      };
      persistentDialog(cm, getQueryDialog(cm), q, searchNext, function(event, query) {
        var keyName = CodeMirror.keyName(event)
        var extra = cm.getOption('extraKeys'), cmd = (extra && extra[keyName]) || CodeMirror.keyMap[cm.getOption("keyMap")][keyName]
        if (cmd == "findNext" || cmd == "findPrev" ||
          cmd == "findPersistentNext" || cmd == "findPersistentPrev") {
          CodeMirror.e_stop(event);
          startSearch(cm, getSearchState(cm), query);
          cm.execCommand(cmd);
        } else if (cmd == "find" || cmd == "findPersistent") {
          CodeMirror.e_stop(event);
          searchNext(query, event);
        }
      });
      if (immediate && q) {
        startSearch(cm, state, q);
        findNext(cm, rev);
      }
    } else {
      dialog(cm, getQueryDialog(cm), "Search for:", q, function(query) {
        if (query && !state.query) cm.operation(function() {
          startSearch(cm, state, query);
          state.posFrom = state.posTo = cm.getCursor();
          findNext(cm, rev);
        });
      });
    }
  }

  function findNext(cm, rev, callback) {cm.operation(function() {
    var state = getSearchState(cm);
    var cursor = getSearchCursor(cm, state.query, rev ? state.posFrom : state.posTo);
    if (!cursor.find(rev)) {
      cursor = getSearchCursor(cm, state.query, rev ? CodeMirror.Pos(cm.lastLine()) : CodeMirror.Pos(cm.firstLine(), 0));
      if (!cursor.find(rev)) return;
    }
    cm.setSelection(cursor.from(), cursor.to());
    cm.scrollIntoView({from: cursor.from(), to: cursor.to()}, 20);
    state.posFrom = cursor.from(); state.posTo = cursor.to();
    if (callback) callback(cursor.from(), cursor.to())
  });}

  function clearSearch(cm) {cm.operation(function() {
    var state = getSearchState(cm);
    state.lastQuery = state.query;
    if (!state.query) return;
    state.query = state.queryText = null;
    cm.removeOverlay(state.overlay);
    if (state.annotate) { state.annotate.clear(); state.annotate = null; }
  });}


  function getQueryDialog(cm)  {
    return '<span class="CodeMirror-search-label">' + cm.phrase("Search:") + '</span> <input type="text" style="width: 10em" class="CodeMirror-search-field"/> <span style="color: #888" class="CodeMirror-search-hint">' + cm.phrase("(Use /re/ syntax for regexp search)") + '</span>';
  }
  function getReplaceQueryDialog(cm) {
    return ' <input type="text" style="width: 10em" class="CodeMirror-search-field"/> <span style="color: #888" class="CodeMirror-search-hint">' + cm.phrase("(Use /re/ syntax for regexp search)") + '</span>';
  }
  function getReplacementQueryDialog(cm) {
    return '<span class="CodeMirror-search-label">' + cm.phrase("With:") + '</span> <input type="text" style="width: 10em" class="CodeMirror-search-field"/>';
  }
  function getDoReplaceConfirm(cm) {
    return '<span class="CodeMirror-search-label">' + cm.phrase("Replace?") + '</span> <button>' + cm.phrase("Yes") + '</button> <button>' + cm.phrase("No") + '</button> <button>' + cm.phrase("All") + '</button> <button>' + cm.phrase("Stop") + '</button> ';
  }

  function replaceAll(cm, query, text) {
    cm.operation(function() {
      for (var cursor = getSearchCursor(cm, query); cursor.findNext();) {
        if (typeof query != "string") {
          var match = cm.getRange(cursor.from(), cursor.to()).match(query);
          cursor.replace(text.replace(/\$(\d)/g, function(_, i) {return match[i];}));
        } else cursor.replace(text);
      }
    });
  }

  function replace(cm, all) {
    if (cm.getOption("readOnly")) return;
    var query = cm.getSelection() || getSearchState(cm).lastQuery;
    var dialogText = '<span class="CodeMirror-search-label">' + (all ? cm.phrase("Replace all:") : cm.phrase("Replace:")) + '</span>';
    dialog(cm, dialogText + getReplaceQueryDialog(cm), dialogText, query, function(query) {
      if (!query) return;
      query = parseQuery(query);
      dialog(cm, getReplacementQueryDialog(cm), cm.phrase("Replace with:"), "", function(text) {
        text = parseString(text)
        if (all) {
          replaceAll(cm, query, text)
        } else {
          clearSearch(cm);
          var cursor = getSearchCursor(cm, query, cm.getCursor("from"));
          var advance = function() {
            var start = cursor.from(), match;
            if (!(match = cursor.findNext())) {
              cursor = getSearchCursor(cm, query);
              if (!(match = cursor.findNext()) ||
                  (start && cursor.from().line == start.line && cursor.from().ch == start.ch)) return;
            }
            cm.setSelection(cursor.from(), cursor.to());
            cm.scrollIntoView({from: cursor.from(), to: cursor.to()});
            confirmDialog(cm, getDoReplaceConfirm(cm), cm.phrase("Replace?"),
                          [function() {doReplace(match);}, advance,
                           function() {replaceAll(cm, query, text)}]);
          };
          var doReplace = function(match) {
            cursor.replace(typeof query == "string" ? text :
                           text.replace(/\$(\d)/g, function(_, i) {return match[i];}));
            advance();
          };
          advance();
        }
      });
    });
  }

  CodeMirror.commands.find = function(cm) {clearSearch(cm); doSearch(cm);};
  CodeMirror.commands.findPersistent = function(cm) {clearSearch(cm); doSearch(cm, false, true);};
  CodeMirror.commands.findPersistentNext = function(cm) {doSearch(cm, false, true, true);};
  CodeMirror.commands.findPersistentPrev = function(cm) {doSearch(cm, true, true, true);};
  CodeMirror.commands.findNext = doSearch;
  CodeMirror.commands.findPrev = function(cm) {doSearch(cm, true);};
  CodeMirror.commands.clearSearch = clearSearch;
  CodeMirror.commands.replace = replace;
  CodeMirror.commands.replaceAll = function(cm) {replace(cm, true);};
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/scroll/annotatescrollbar',["../../CodeMirror"], function(CodeMirror) {
  "use strict";

  CodeMirror.defineExtension("annotateScrollbar", function(options) {
    if (typeof options == "string") options = {className: options};
    return new Annotation(this, options);
  });

  CodeMirror.defineOption("scrollButtonHeight", 0);

  function Annotation(cm, options) {
    this.cm = cm;
    this.options = options;
    this.buttonHeight = options.scrollButtonHeight || cm.getOption("scrollButtonHeight");
    this.annotations = [];
    this.doRedraw = this.doUpdate = null;
    this.div = cm.getWrapperElement().appendChild(document.createElement("div"));
    this.div.style.cssText = "position: absolute; right: 0; top: 0; z-index: 7; pointer-events: none";
    this.computeScale();

    function scheduleRedraw(delay) {
      clearTimeout(self.doRedraw);
      self.doRedraw = setTimeout(function() { self.redraw(); }, delay);
    }

    var self = this;
    cm.on("refresh", this.resizeHandler = function() {
      clearTimeout(self.doUpdate);
      self.doUpdate = setTimeout(function() {
        if (self.computeScale()) scheduleRedraw(20);
      }, 100);
    });
    cm.on("markerAdded", this.resizeHandler);
    cm.on("markerCleared", this.resizeHandler);
    if (options.listenForChanges !== false)
      cm.on("change", this.changeHandler = function() {
        scheduleRedraw(250);
      });
  }

  Annotation.prototype.computeScale = function() {
    var cm = this.cm;
    var hScale = (cm.getWrapperElement().clientHeight - cm.display.barHeight - this.buttonHeight * 2) /
      cm.getScrollerElement().scrollHeight
    if (hScale != this.hScale) {
      this.hScale = hScale;
      return true;
    }
  };

  Annotation.prototype.update = function(annotations) {
    this.annotations = annotations;
    this.redraw();
  };

  Annotation.prototype.redraw = function(compute) {
    if (compute !== false) this.computeScale();
    var cm = this.cm, hScale = this.hScale;

    var frag = document.createDocumentFragment(), anns = this.annotations;

    var wrapping = cm.getOption("lineWrapping");
    var singleLineH = wrapping && cm.defaultTextHeight() * 1.5;
    var curLine = null, curLineObj = null;
    function getY(pos, top) {
      if (curLine != pos.line) {
        curLine = pos.line;
        curLineObj = cm.getLineHandle(curLine);
      }
      if ((curLineObj.widgets && curLineObj.widgets.length) ||
          (wrapping && curLineObj.height > singleLineH))
        return cm.charCoords(pos, "local")[top ? "top" : "bottom"];
      var topY = cm.heightAtLine(curLineObj, "local");
      return topY + (top ? 0 : curLineObj.height);
    }

    var lastLine = cm.lastLine()
    if (cm.display.barWidth) for (var i = 0, nextTop; i < anns.length; i++) {
      var ann = anns[i];
      if (ann.to.line > lastLine) continue;
      var top = nextTop || getY(ann.from, true) * hScale;
      var bottom = getY(ann.to, false) * hScale;
      while (i < anns.length - 1) {
        if (anns[i + 1].to.line > lastLine) break;
        nextTop = getY(anns[i + 1].from, true) * hScale;
        if (nextTop > bottom + .9) break;
        ann = anns[++i];
        bottom = getY(ann.to, false) * hScale;
      }
      if (bottom == top) continue;
      var height = Math.max(bottom - top, 3);

      var elt = frag.appendChild(document.createElement("div"));
      elt.style.cssText = "position: absolute; right: 0px; width: " + Math.max(cm.display.barWidth - 1, 2) + "px; top: "
        + (top + this.buttonHeight) + "px; height: " + height + "px";
      elt.className = this.options.className;
      if (ann.id) {
        elt.setAttribute("annotation-id", ann.id);
      }
    }
    this.div.textContent = "";
    this.div.appendChild(frag);
  };

  Annotation.prototype.clear = function() {
    this.cm.off("refresh", this.resizeHandler);
    this.cm.off("markerAdded", this.resizeHandler);
    this.cm.off("markerCleared", this.resizeHandler);
    if (this.changeHandler) this.cm.off("change", this.changeHandler);
    this.div.parentNode.removeChild(this.div);
  };
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/search/matchesonscrollbar',["../../CodeMirror", "./searchcursor", "../scroll/annotatescrollbar"], function(CodeMirror) {
  "use strict";

  CodeMirror.defineExtension("showMatchesOnScrollbar", function(query, caseFold, options) {
    if (typeof options == "string") options = {className: options};
    if (!options) options = {};
    return new SearchAnnotation(this, query, caseFold, options);
  });

  function SearchAnnotation(cm, query, caseFold, options) {
    this.cm = cm;
    this.options = options;
    var annotateOptions = {listenForChanges: false};
    for (var prop in options) annotateOptions[prop] = options[prop];
    if (!annotateOptions.className) annotateOptions.className = "CodeMirror-search-match";
    this.annotation = cm.annotateScrollbar(annotateOptions);
    this.query = query;
    this.caseFold = caseFold;
    this.gap = {from: cm.firstLine(), to: cm.lastLine() + 1};
    this.matches = [];
    this.update = null;

    this.findMatches();
    this.annotation.update(this.matches);

    var self = this;
    cm.on("change", this.changeHandler = function(_cm, change) { self.onChange(change); });
  }

  var MAX_MATCHES = 1000;

  SearchAnnotation.prototype.findMatches = function() {
    if (!this.gap) return;
    for (var i = 0; i < this.matches.length; i++) {
      var match = this.matches[i];
      if (match.from.line >= this.gap.to) break;
      if (match.to.line >= this.gap.from) this.matches.splice(i--, 1);
    }
    var cursor = this.cm.getSearchCursor(this.query, CodeMirror.Pos(this.gap.from, 0), this.caseFold);
    var maxMatches = this.options && this.options.maxMatches || MAX_MATCHES;
    while (cursor.findNext()) {
      var match = {from: cursor.from(), to: cursor.to()};
      if (match.from.line >= this.gap.to) break;
      this.matches.splice(i++, 0, match);
      if (this.matches.length > maxMatches) break;
    }
    this.gap = null;
  };

  function offsetLine(line, changeStart, sizeChange) {
    if (line <= changeStart) return line;
    return Math.max(changeStart, line + sizeChange);
  }

  SearchAnnotation.prototype.onChange = function(change) {
    var startLine = change.from.line;
    var endLine = CodeMirror.changeEnd(change).line;
    var sizeChange = endLine - change.to.line;
    if (this.gap) {
      this.gap.from = Math.min(offsetLine(this.gap.from, startLine, sizeChange), change.from.line);
      this.gap.to = Math.max(offsetLine(this.gap.to, startLine, sizeChange), change.from.line);
    } else {
      this.gap = {from: change.from.line, to: endLine + 1};
    }

    if (sizeChange) for (var i = 0; i < this.matches.length; i++) {
      var match = this.matches[i];
      var newFrom = offsetLine(match.from.line, startLine, sizeChange);
      if (newFrom != match.from.line) match.from = CodeMirror.Pos(newFrom, match.from.ch);
      var newTo = offsetLine(match.to.line, startLine, sizeChange);
      if (newTo != match.to.line) match.to = CodeMirror.Pos(newTo, match.to.ch);
    }
    clearTimeout(this.update);
    var self = this;
    this.update = setTimeout(function() { self.updateAfterChange(); }, 250);
  };

  SearchAnnotation.prototype.updateAfterChange = function() {
    this.findMatches();
    this.annotation.update(this.matches);
  };

  SearchAnnotation.prototype.clear = function() {
    this.cm.off("change", this.changeHandler);
    this.annotation.clear();
  };
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

// Highlighting text that matches the selection
//
// Defines an option highlightSelectionMatches, which, when enabled,
// will style strings that match the selection throughout the
// document.
//
// The option can be set to true to simply enable it, or to a
// {minChars, style, wordsOnly, showToken, delay} object to explicitly
// configure it. minChars is the minimum amount of characters that should be
// selected for the behavior to occur, and style is the token style to
// apply to the matches. This will be prefixed by "cm-" to create an
// actual CSS class name. If wordsOnly is enabled, the matches will be
// highlighted only if the selected text is a word. showToken, when enabled,
// will cause the current token to be highlighted when nothing is selected.
// delay is used to specify how much time to wait, in milliseconds, before
// highlighting the matches. If annotateScrollbar is enabled, the occurences
// will be highlighted on the scrollbar via the matchesonscrollbar addon.

define('skylark-codemirror/addon/search/match-highlighter',["../../CodeMirror", "./matchesonscrollbar"], function(CodeMirror) {
  "use strict";

  var defaults = {
    style: "matchhighlight",
    minChars: 2,
    delay: 100,
    wordsOnly: false,
    annotateScrollbar: false,
    showToken: false,
    trim: true
  }

  function State(options) {
    this.options = {}
    for (var name in defaults)
      this.options[name] = (options && options.hasOwnProperty(name) ? options : defaults)[name]
    this.overlay = this.timeout = null;
    this.matchesonscroll = null;
    this.active = false;
  }

  CodeMirror.defineOption("highlightSelectionMatches", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init) {
      removeOverlay(cm);
      clearTimeout(cm.state.matchHighlighter.timeout);
      cm.state.matchHighlighter = null;
      cm.off("cursorActivity", cursorActivity);
      cm.off("focus", onFocus)
    }
    if (val) {
      var state = cm.state.matchHighlighter = new State(val);
      if (cm.hasFocus()) {
        state.active = true
        highlightMatches(cm)
      } else {
        cm.on("focus", onFocus)
      }
      cm.on("cursorActivity", cursorActivity);
    }
  });

  function cursorActivity(cm) {
    var state = cm.state.matchHighlighter;
    if (state.active || cm.hasFocus()) scheduleHighlight(cm, state)
  }

  function onFocus(cm) {
    var state = cm.state.matchHighlighter
    if (!state.active) {
      state.active = true
      scheduleHighlight(cm, state)
    }
  }

  function scheduleHighlight(cm, state) {
    clearTimeout(state.timeout);
    state.timeout = setTimeout(function() {highlightMatches(cm);}, state.options.delay);
  }

  function addOverlay(cm, query, hasBoundary, style) {
    var state = cm.state.matchHighlighter;
    cm.addOverlay(state.overlay = makeOverlay(query, hasBoundary, style));
    if (state.options.annotateScrollbar && cm.showMatchesOnScrollbar) {
      var searchFor = hasBoundary ? new RegExp("\\b" + query.replace(/[\\\[.+*?(){|^$]/g, "\\$&") + "\\b") : query;
      state.matchesonscroll = cm.showMatchesOnScrollbar(searchFor, false,
        {className: "CodeMirror-selection-highlight-scrollbar"});
    }
  }

  function removeOverlay(cm) {
    var state = cm.state.matchHighlighter;
    if (state.overlay) {
      cm.removeOverlay(state.overlay);
      state.overlay = null;
      if (state.matchesonscroll) {
        state.matchesonscroll.clear();
        state.matchesonscroll = null;
      }
    }
  }

  function highlightMatches(cm) {
    cm.operation(function() {
      var state = cm.state.matchHighlighter;
      removeOverlay(cm);
      if (!cm.somethingSelected() && state.options.showToken) {
        var re = state.options.showToken === true ? /[\w$]/ : state.options.showToken;
        var cur = cm.getCursor(), line = cm.getLine(cur.line), start = cur.ch, end = start;
        while (start && re.test(line.charAt(start - 1))) --start;
        while (end < line.length && re.test(line.charAt(end))) ++end;
        if (start < end)
          addOverlay(cm, line.slice(start, end), re, state.options.style);
        return;
      }
      var from = cm.getCursor("from"), to = cm.getCursor("to");
      if (from.line != to.line) return;
      if (state.options.wordsOnly && !isWord(cm, from, to)) return;
      var selection = cm.getRange(from, to)
      if (state.options.trim) selection = selection.replace(/^\s+|\s+$/g, "")
      if (selection.length >= state.options.minChars)
        addOverlay(cm, selection, false, state.options.style);
    });
  }

  function isWord(cm, from, to) {
    var str = cm.getRange(from, to);
    if (str.match(/^\w+$/) !== null) {
        if (from.ch > 0) {
            var pos = {line: from.line, ch: from.ch - 1};
            var chr = cm.getRange(pos, from);
            if (chr.match(/\W/) === null) return false;
        }
        if (to.ch < cm.getLine(from.line).length) {
            var pos = {line: to.line, ch: to.ch + 1};
            var chr = cm.getRange(to, pos);
            if (chr.match(/\W/) === null) return false;
        }
        return true;
    } else return false;
  }

  function boundariesAround(stream, re) {
    return (!stream.start || !re.test(stream.string.charAt(stream.start - 1))) &&
      (stream.pos == stream.string.length || !re.test(stream.string.charAt(stream.pos)));
  }

  function makeOverlay(query, hasBoundary, style) {
    return {token: function(stream) {
      if (stream.match(query) &&
          (!hasBoundary || boundariesAround(stream, hasBoundary)))
        return style;
      stream.next();
      stream.skipTo(query.charAt(0)) || stream.skipToEnd();
    }};
  }
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/hint/anyword-hint',["../../CodeMirror"], function(CodeMirror) {
  "use strict";

  var WORD = /[\w$]+/, RANGE = 500;

  CodeMirror.registerHelper("hint", "anyword", function(editor, options) {
    var word = options && options.word || WORD;
    var range = options && options.range || RANGE;
    var cur = editor.getCursor(), curLine = editor.getLine(cur.line);
    var end = cur.ch, start = end;
    while (start && word.test(curLine.charAt(start - 1))) --start;
    var curWord = start != end && curLine.slice(start, end);

    var list = options && options.list || [], seen = {};
    var re = new RegExp(word.source, "g");
    for (var dir = -1; dir <= 1; dir += 2) {
      var line = cur.line, endLine = Math.min(Math.max(line + dir * range, editor.firstLine()), editor.lastLine()) + dir;
      for (; line != endLine; line += dir) {
        var text = editor.getLine(line), m;
        while (m = re.exec(text)) {
          if (line == cur.line && m[0] === curWord) continue;
          if ((!curWord || m[0].lastIndexOf(curWord, 0) == 0) && !Object.prototype.hasOwnProperty.call(seen, m[0])) {
            seen[m[0]] = true;
            list.push(m[0]);
          }
        }
      }
    }
    return {list: list, from: CodeMirror.Pos(cur.line, start), to: CodeMirror.Pos(cur.line, end)};
  });
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/hint/javascript-hint',["../../CodeMirror"], function(CodeMirror) {
  var Pos = CodeMirror.Pos;

  function forEach(arr, f) {
    for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
  }

  function arrayContains(arr, item) {
    if (!Array.prototype.indexOf) {
      var i = arr.length;
      while (i--) {
        if (arr[i] === item) {
          return true;
        }
      }
      return false;
    }
    return arr.indexOf(item) != -1;
  }

  function scriptHint(editor, keywords, getToken, options) {
    // Find the token at the cursor
    var cur = editor.getCursor(), token = getToken(editor, cur);
    if (/\b(?:string|comment)\b/.test(token.type)) return;
    var innerMode = CodeMirror.innerMode(editor.getMode(), token.state);
    if (innerMode.mode.helperType === "json") return;
    token.state = innerMode.state;

    // If it's not a 'word-style' token, ignore the token.
    if (!/^[\w$_]*$/.test(token.string)) {
      token = {start: cur.ch, end: cur.ch, string: "", state: token.state,
               type: token.string == "." ? "property" : null};
    } else if (token.end > cur.ch) {
      token.end = cur.ch;
      token.string = token.string.slice(0, cur.ch - token.start);
    }

    var tprop = token;
    // If it is a property, find out what it is a property of.
    while (tprop.type == "property") {
      tprop = getToken(editor, Pos(cur.line, tprop.start));
      if (tprop.string != ".") return;
      tprop = getToken(editor, Pos(cur.line, tprop.start));
      if (!context) var context = [];
      context.push(tprop);
    }
    return {list: getCompletions(token, context, keywords, options),
            from: Pos(cur.line, token.start),
            to: Pos(cur.line, token.end)};
  }

  function javascriptHint(editor, options) {
    return scriptHint(editor, javascriptKeywords,
                      function (e, cur) {return e.getTokenAt(cur);},
                      options);
  };
  CodeMirror.registerHelper("hint", "javascript", javascriptHint);

  function getCoffeeScriptToken(editor, cur) {
  // This getToken, it is for coffeescript, imitates the behavior of
  // getTokenAt method in javascript.js, that is, returning "property"
  // type and treat "." as indepenent token.
    var token = editor.getTokenAt(cur);
    if (cur.ch == token.start + 1 && token.string.charAt(0) == '.') {
      token.end = token.start;
      token.string = '.';
      token.type = "property";
    }
    else if (/^\.[\w$_]*$/.test(token.string)) {
      token.type = "property";
      token.start++;
      token.string = token.string.replace(/\./, '');
    }
    return token;
  }

  function coffeescriptHint(editor, options) {
    return scriptHint(editor, coffeescriptKeywords, getCoffeeScriptToken, options);
  }
  CodeMirror.registerHelper("hint", "coffeescript", coffeescriptHint);

  var stringProps = ("charAt charCodeAt indexOf lastIndexOf substring substr slice trim trimLeft trimRight " +
                     "toUpperCase toLowerCase split concat match replace search").split(" ");
  var arrayProps = ("length concat join splice push pop shift unshift slice reverse sort indexOf " +
                    "lastIndexOf every some filter forEach map reduce reduceRight ").split(" ");
  var funcProps = "prototype apply call bind".split(" ");
  var javascriptKeywords = ("break case catch class const continue debugger default delete do else export extends false finally for function " +
                  "if in import instanceof new null return super switch this throw true try typeof var void while with yield").split(" ");
  var coffeescriptKeywords = ("and break catch class continue delete do else extends false finally for " +
                  "if in instanceof isnt new no not null of off on or return switch then throw true try typeof until void while with yes").split(" ");

  function forAllProps(obj, callback) {
    if (!Object.getOwnPropertyNames || !Object.getPrototypeOf) {
      for (var name in obj) callback(name)
    } else {
      for (var o = obj; o; o = Object.getPrototypeOf(o))
        Object.getOwnPropertyNames(o).forEach(callback)
    }
  }

  function getCompletions(token, context, keywords, options) {
    var found = [], start = token.string, global = options && options.globalScope || window;
    function maybeAdd(str) {
      if (str.lastIndexOf(start, 0) == 0 && !arrayContains(found, str)) found.push(str);
    }
    function gatherCompletions(obj) {
      if (typeof obj == "string") forEach(stringProps, maybeAdd);
      else if (obj instanceof Array) forEach(arrayProps, maybeAdd);
      else if (obj instanceof Function) forEach(funcProps, maybeAdd);
      forAllProps(obj, maybeAdd)
    }

    if (context && context.length) {
      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(), base;
      if (obj.type && obj.type.indexOf("variable") === 0) {
        if (options && options.additionalContext)
          base = options.additionalContext[obj.string];
        if (!options || options.useGlobalScope !== false)
          base = base || global[obj.string];
      } else if (obj.type == "string") {
        base = "";
      } else if (obj.type == "atom") {
        base = 1;
      } else if (obj.type == "function") {
        if (global.jQuery != null && (obj.string == '$' || obj.string == 'jQuery') &&
            (typeof global.jQuery == 'function'))
          base = global.jQuery();
        else if (global._ != null && (obj.string == '_') && (typeof global._ == 'function'))
          base = global._();
      }
      while (base != null && context.length)
        base = base[context.pop().string];
      if (base != null) gatherCompletions(base);
    } else {
      // If not, just look in the global object and any local scope
      // (reading into JS mode internals to get at the local and global variables)
      for (var v = token.state.localVars; v; v = v.next) maybeAdd(v.name);
      for (var v = token.state.globalVars; v; v = v.next) maybeAdd(v.name);
      if (!options || options.useGlobalScope !== false)
        gatherCompletions(global);
      forEach(keywords, maybeAdd);
    }
    return found;
  }
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/lint/javascript-lint',["../../CodeMirror"], function(CodeMirror) {
  "use strict";
  // declare global: JSHINT

  function validator(text, options) {
    if (!window.JSHINT) {
      if (window.console) {
        window.console.error("Error: window.JSHINT not defined, CodeMirror JavaScript linting cannot run.");
      }
      return [];
    }
    if (!options.indent) // JSHint error.character actually is a column index, this fixes underlining on lines using tabs for indentation
      options.indent = 1; // JSHint default value is 4
    JSHINT(text, options, options.globals);
    var errors = JSHINT.data().errors, result = [];
    if (errors) parseErrors(errors, result);
    return result;
  }

  CodeMirror.registerHelper("lint", "javascript", validator);

  function parseErrors(errors, output) {
    for ( var i = 0; i < errors.length; i++) {
      var error = errors[i];
      if (error) {
        if (error.line <= 0) {
          if (window.console) {
            window.console.warn("Cannot display JSHint error (invalid line " + error.line + ")", error);
          }
          continue;
        }

        var start = error.character - 1, end = start + 1;
        if (error.evidence) {
          var index = error.evidence.substring(start).search(/.\b/);
          if (index > -1) {
            end += index;
          }
        }

        // Convert to format expected by validation service
        var hint = {
          message: error.reason,
          severity: error.code ? (error.code.startsWith('W') ? "warning" : "error") : "error",
          from: CodeMirror.Pos(error.line - 1, start),
          to: CodeMirror.Pos(error.line - 1, end)
        };

        output.push(hint);
      }
    }
  }
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

define('skylark-codemirror/addon/lint/lint',["../../CodeMirror"], function(CodeMirror) {
  "use strict";
  var GUTTER_ID = "CodeMirror-lint-markers";

  function showTooltip(e, content) {
    var tt = document.createElement("div");
    tt.className = "CodeMirror-lint-tooltip";
    tt.appendChild(content.cloneNode(true));
    document.body.appendChild(tt);

    function position(e) {
      if (!tt.parentNode) return CodeMirror.off(document, "mousemove", position);
      tt.style.top = Math.max(0, e.clientY - tt.offsetHeight - 5) + "px";
      tt.style.left = (e.clientX + 5) + "px";
    }
    CodeMirror.on(document, "mousemove", position);
    position(e);
    if (tt.style.opacity != null) tt.style.opacity = 1;
    return tt;
  }
  function rm(elt) {
    if (elt.parentNode) elt.parentNode.removeChild(elt);
  }
  function hideTooltip(tt) {
    if (!tt.parentNode) return;
    if (tt.style.opacity == null) rm(tt);
    tt.style.opacity = 0;
    setTimeout(function() { rm(tt); }, 600);
  }

  function showTooltipFor(e, content, node) {
    var tooltip = showTooltip(e, content);
    function hide() {
      CodeMirror.off(node, "mouseout", hide);
      if (tooltip) { hideTooltip(tooltip); tooltip = null; }
    }
    var poll = setInterval(function() {
      if (tooltip) for (var n = node;; n = n.parentNode) {
        if (n && n.nodeType == 11) n = n.host;
        if (n == document.body) return;
        if (!n) { hide(); break; }
      }
      if (!tooltip) return clearInterval(poll);
    }, 400);
    CodeMirror.on(node, "mouseout", hide);
  }

  function LintState(cm, options, hasGutter) {
    this.marked = [];
    this.options = options;
    this.timeout = null;
    this.hasGutter = hasGutter;
    this.onMouseOver = function(e) { onMouseOver(cm, e); };
    this.waitingFor = 0
  }

  function parseOptions(_cm, options) {
    if (options instanceof Function) return {getAnnotations: options};
    if (!options || options === true) options = {};
    return options;
  }

  function clearMarks(cm) {
    var state = cm.state.lint;
    if (state.hasGutter) cm.clearGutter(GUTTER_ID);
    for (var i = 0; i < state.marked.length; ++i)
      state.marked[i].clear();
    state.marked.length = 0;
  }

  function makeMarker(labels, severity, multiple, tooltips) {
    var marker = document.createElement("div"), inner = marker;
    marker.className = "CodeMirror-lint-marker-" + severity;
    if (multiple) {
      inner = marker.appendChild(document.createElement("div"));
      inner.className = "CodeMirror-lint-marker-multiple";
    }

    if (tooltips != false) CodeMirror.on(inner, "mouseover", function(e) {
      showTooltipFor(e, labels, inner);
    });

    return marker;
  }

  function getMaxSeverity(a, b) {
    if (a == "error") return a;
    else return b;
  }

  function groupByLine(annotations) {
    var lines = [];
    for (var i = 0; i < annotations.length; ++i) {
      var ann = annotations[i], line = ann.from.line;
      (lines[line] || (lines[line] = [])).push(ann);
    }
    return lines;
  }

  function annotationTooltip(ann) {
    var severity = ann.severity;
    if (!severity) severity = "error";
    var tip = document.createElement("div");
    tip.className = "CodeMirror-lint-message-" + severity;
    if (typeof ann.messageHTML != 'undefined') {
        tip.innerHTML = ann.messageHTML;
    } else {
        tip.appendChild(document.createTextNode(ann.message));
    }
    return tip;
  }

  function lintAsync(cm, getAnnotations, passOptions) {
    var state = cm.state.lint
    var id = ++state.waitingFor
    function abort() {
      id = -1
      cm.off("change", abort)
    }
    cm.on("change", abort)
    getAnnotations(cm.getValue(), function(annotations, arg2) {
      cm.off("change", abort)
      if (state.waitingFor != id) return
      if (arg2 && annotations instanceof CodeMirror) annotations = arg2
      cm.operation(function() {updateLinting(cm, annotations)})
    }, passOptions, cm);
  }

  function startLinting(cm) {
    var state = cm.state.lint, options = state.options;
    /*
     * Passing rules in `options` property prevents JSHint (and other linters) from complaining
     * about unrecognized rules like `onUpdateLinting`, `delay`, `lintOnChange`, etc.
     */
    var passOptions = options.options || options;
    var getAnnotations = options.getAnnotations || cm.getHelper(CodeMirror.Pos(0, 0), "lint");
    if (!getAnnotations) return;
    if (options.async || getAnnotations.async) {
      lintAsync(cm, getAnnotations, passOptions)
    } else {
      var annotations = getAnnotations(cm.getValue(), passOptions, cm);
      if (!annotations) return;
      if (annotations.then) annotations.then(function(issues) {
        cm.operation(function() {updateLinting(cm, issues)})
      });
      else cm.operation(function() {updateLinting(cm, annotations)})
    }
  }

  function updateLinting(cm, annotationsNotSorted) {
    clearMarks(cm);
    var state = cm.state.lint, options = state.options;

    var annotations = groupByLine(annotationsNotSorted);

    for (var line = 0; line < annotations.length; ++line) {
      var anns = annotations[line];
      if (!anns) continue;

      var maxSeverity = null;
      var tipLabel = state.hasGutter && document.createDocumentFragment();

      for (var i = 0; i < anns.length; ++i) {
        var ann = anns[i];
        var severity = ann.severity;
        if (!severity) severity = "error";
        maxSeverity = getMaxSeverity(maxSeverity, severity);

        if (options.formatAnnotation) ann = options.formatAnnotation(ann);
        if (state.hasGutter) tipLabel.appendChild(annotationTooltip(ann));

        if (ann.to) state.marked.push(cm.markText(ann.from, ann.to, {
          className: "CodeMirror-lint-mark-" + severity,
          __annotation: ann
        }));
      }

      if (state.hasGutter)
        cm.setGutterMarker(line, GUTTER_ID, makeMarker(tipLabel, maxSeverity, anns.length > 1,
                                                       state.options.tooltips));
    }
    if (options.onUpdateLinting) options.onUpdateLinting(annotationsNotSorted, annotations, cm);
  }

  function onChange(cm) {
    var state = cm.state.lint;
    if (!state) return;
    clearTimeout(state.timeout);
    state.timeout = setTimeout(function(){startLinting(cm);}, state.options.delay || 500);
  }

  function popupTooltips(annotations, e) {
    var target = e.target || e.srcElement;
    var tooltip = document.createDocumentFragment();
    for (var i = 0; i < annotations.length; i++) {
      var ann = annotations[i];
      tooltip.appendChild(annotationTooltip(ann));
    }
    showTooltipFor(e, tooltip, target);
  }

  function onMouseOver(cm, e) {
    var target = e.target || e.srcElement;
    if (!/\bCodeMirror-lint-mark-/.test(target.className)) return;
    var box = target.getBoundingClientRect(), x = (box.left + box.right) / 2, y = (box.top + box.bottom) / 2;
    var spans = cm.findMarksAt(cm.coordsChar({left: x, top: y}, "client"));

    var annotations = [];
    for (var i = 0; i < spans.length; ++i) {
      var ann = spans[i].__annotation;
      if (ann) annotations.push(ann);
    }
    if (annotations.length) popupTooltips(annotations, e);
  }

  CodeMirror.defineOption("lint", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init) {
      clearMarks(cm);
      if (cm.state.lint.options.lintOnChange !== false)
        cm.off("change", onChange);
      CodeMirror.off(cm.getWrapperElement(), "mouseover", cm.state.lint.onMouseOver);
      clearTimeout(cm.state.lint.timeout);
      delete cm.state.lint;
    }

    if (val) {
      var gutters = cm.getOption("gutters"), hasLintGutter = false;
      for (var i = 0; i < gutters.length; ++i) if (gutters[i] == GUTTER_ID) hasLintGutter = true;
      var state = cm.state.lint = new LintState(cm, parseOptions(cm, val), hasLintGutter);
      if (state.options.lintOnChange !== false)
        cm.on("change", onChange);
      if (state.options.tooltips != false && state.options.tooltips != "gutter")
        CodeMirror.on(cm.getWrapperElement(), "mouseover", state.onMouseOver);

      startLinting(cm);
    }
  });

  CodeMirror.defineExtension("performLint", function() {
    if (this.state.lint) startLinting(this);
  });
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

// Glue code between CodeMirror and Tern.
//
// Create a CodeMirror.TernServer to wrap an actual Tern server,
// register open documents (CodeMirror.Doc instances) with it, and
// call its methods to activate the assisting functions that Tern
// provides.
//
// Options supported (all optional):
// * defs: An array of JSON definition data structures.
// * plugins: An object mapping plugin names to configuration
//   options.
// * getFile: A function(name, c) that can be used to access files in
//   the project that haven't been loaded yet. Simply do c(null) to
//   indicate that a file is not available.
// * fileFilter: A function(value, docName, doc) that will be applied
//   to documents before passing them on to Tern.
// * switchToDoc: A function(name, doc) that should, when providing a
//   multi-file view, switch the view or focus to the named file.
// * showError: A function(editor, message) that can be used to
//   override the way errors are displayed.
// * completionTip: Customize the content in tooltips for completions.
//   Is passed a single argument—the completion's data as returned by
//   Tern—and may return a string, DOM node, or null to indicate that
//   no tip should be shown. By default the docstring is shown.
// * typeTip: Like completionTip, but for the tooltips shown for type
//   queries.
// * responseFilter: A function(doc, query, request, error, data) that
//   will be applied to the Tern responses before treating them
//
//
// It is possible to run the Tern server in a web worker by specifying
// these additional options:
// * useWorker: Set to true to enable web worker mode. You'll probably
//   want to feature detect the actual value you use here, for example
//   !!window.Worker.
// * workerScript: The main script of the worker. Point this to
//   wherever you are hosting worker.js from this directory.
// * workerDeps: An array of paths pointing (relative to workerScript)
//   to the Acorn and Tern libraries and any Tern plugins you want to
//   load. Or, if you minified those into a single script and included
//   them in the workerScript, simply leave this undefined.

define('skylark-codemirror/addon/tern/tern',["../../CodeMirror"], function(CodeMirror) {
  "use strict";
  // declare global: tern

  CodeMirror.TernServer = function(options) {
    var self = this;
    this.options = options || {};
    var plugins = this.options.plugins || (this.options.plugins = {});
    if (!plugins.doc_comment) plugins.doc_comment = true;
    this.docs = Object.create(null);
    if (this.options.useWorker) {
      this.server = new WorkerServer(this);
    } else {
      this.server = new tern.Server({
        getFile: function(name, c) { return getFile(self, name, c); },
        async: true,
        defs: this.options.defs || [],
        plugins: plugins
      });
    }
    this.trackChange = function(doc, change) { trackChange(self, doc, change); };

    this.cachedArgHints = null;
    this.activeArgHints = null;
    this.jumpStack = [];

    this.getHint = function(cm, c) { return hint(self, cm, c); };
    this.getHint.async = true;
  };

  CodeMirror.TernServer.prototype = {
    addDoc: function(name, doc) {
      var data = {doc: doc, name: name, changed: null};
      this.server.addFile(name, docValue(this, data));
      CodeMirror.on(doc, "change", this.trackChange);
      return this.docs[name] = data;
    },

    delDoc: function(id) {
      var found = resolveDoc(this, id);
      if (!found) return;
      CodeMirror.off(found.doc, "change", this.trackChange);
      delete this.docs[found.name];
      this.server.delFile(found.name);
    },

    hideDoc: function(id) {
      closeArgHints(this);
      var found = resolveDoc(this, id);
      if (found && found.changed) sendDoc(this, found);
    },

    complete: function(cm) {
      cm.showHint({hint: this.getHint});
    },

    showType: function(cm, pos, c) { showContextInfo(this, cm, pos, "type", c); },

    showDocs: function(cm, pos, c) { showContextInfo(this, cm, pos, "documentation", c); },

    updateArgHints: function(cm) { updateArgHints(this, cm); },

    jumpToDef: function(cm) { jumpToDef(this, cm); },

    jumpBack: function(cm) { jumpBack(this, cm); },

    rename: function(cm) { rename(this, cm); },

    selectName: function(cm) { selectName(this, cm); },

    request: function (cm, query, c, pos) {
      var self = this;
      var doc = findDoc(this, cm.getDoc());
      var request = buildRequest(this, doc, query, pos);
      var extraOptions = request.query && this.options.queryOptions && this.options.queryOptions[request.query.type]
      if (extraOptions) for (var prop in extraOptions) request.query[prop] = extraOptions[prop];

      this.server.request(request, function (error, data) {
        if (!error && self.options.responseFilter)
          data = self.options.responseFilter(doc, query, request, error, data);
        c(error, data);
      });
    },

    destroy: function () {
      closeArgHints(this)
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
    }
  };

  var Pos = CodeMirror.Pos;
  var cls = "CodeMirror-Tern-";
  var bigDoc = 250;

  function getFile(ts, name, c) {
    var buf = ts.docs[name];
    if (buf)
      c(docValue(ts, buf));
    else if (ts.options.getFile)
      ts.options.getFile(name, c);
    else
      c(null);
  }

  function findDoc(ts, doc, name) {
    for (var n in ts.docs) {
      var cur = ts.docs[n];
      if (cur.doc == doc) return cur;
    }
    if (!name) for (var i = 0;; ++i) {
      n = "[doc" + (i || "") + "]";
      if (!ts.docs[n]) { name = n; break; }
    }
    return ts.addDoc(name, doc);
  }

  function resolveDoc(ts, id) {
    if (typeof id == "string") return ts.docs[id];
    if (id instanceof CodeMirror) id = id.getDoc();
    if (id instanceof CodeMirror.Doc) return findDoc(ts, id);
  }

  function trackChange(ts, doc, change) {
    var data = findDoc(ts, doc);

    var argHints = ts.cachedArgHints;
    if (argHints && argHints.doc == doc && cmpPos(argHints.start, change.to) >= 0)
      ts.cachedArgHints = null;

    var changed = data.changed;
    if (changed == null)
      data.changed = changed = {from: change.from.line, to: change.from.line};
    var end = change.from.line + (change.text.length - 1);
    if (change.from.line < changed.to) changed.to = changed.to - (change.to.line - end);
    if (end >= changed.to) changed.to = end + 1;
    if (changed.from > change.from.line) changed.from = change.from.line;

    if (doc.lineCount() > bigDoc && change.to - changed.from > 100) setTimeout(function() {
      if (data.changed && data.changed.to - data.changed.from > 100) sendDoc(ts, data);
    }, 200);
  }

  function sendDoc(ts, doc) {
    ts.server.request({files: [{type: "full", name: doc.name, text: docValue(ts, doc)}]}, function(error) {
      if (error) window.console.error(error);
      else doc.changed = null;
    });
  }

  // Completion

  function hint(ts, cm, c) {
    ts.request(cm, {type: "completions", types: true, docs: true, urls: true}, function(error, data) {
      if (error) return showError(ts, cm, error);
      var completions = [], after = "";
      var from = data.start, to = data.end;
      if (cm.getRange(Pos(from.line, from.ch - 2), from) == "[\"" &&
          cm.getRange(to, Pos(to.line, to.ch + 2)) != "\"]")
        after = "\"]";

      for (var i = 0; i < data.completions.length; ++i) {
        var completion = data.completions[i], className = typeToIcon(completion.type);
        if (data.guess) className += " " + cls + "guess";
        completions.push({text: completion.name + after,
                          displayText: completion.displayName || completion.name,
                          className: className,
                          data: completion});
      }

      var obj = {from: from, to: to, list: completions};
      var tooltip = null;
      CodeMirror.on(obj, "close", function() { remove(tooltip); });
      CodeMirror.on(obj, "update", function() { remove(tooltip); });
      CodeMirror.on(obj, "select", function(cur, node) {
        remove(tooltip);
        var content = ts.options.completionTip ? ts.options.completionTip(cur.data) : cur.data.doc;
        if (content) {
          tooltip = makeTooltip(node.parentNode.getBoundingClientRect().right + window.pageXOffset,
                                node.getBoundingClientRect().top + window.pageYOffset, content);
          tooltip.className += " " + cls + "hint-doc";
        }
      });
      c(obj);
    });
  }

  function typeToIcon(type) {
    var suffix;
    if (type == "?") suffix = "unknown";
    else if (type == "number" || type == "string" || type == "bool") suffix = type;
    else if (/^fn\(/.test(type)) suffix = "fn";
    else if (/^\[/.test(type)) suffix = "array";
    else suffix = "object";
    return cls + "completion " + cls + "completion-" + suffix;
  }

  // Type queries

  function showContextInfo(ts, cm, pos, queryName, c) {
    ts.request(cm, queryName, function(error, data) {
      if (error) return showError(ts, cm, error);
      if (ts.options.typeTip) {
        var tip = ts.options.typeTip(data);
      } else {
        var tip = elt("span", null, elt("strong", null, data.type || "not found"));
        if (data.doc)
          tip.appendChild(document.createTextNode(" — " + data.doc));
        if (data.url) {
          tip.appendChild(document.createTextNode(" "));
          var child = tip.appendChild(elt("a", null, "[docs]"));
          child.href = data.url;
          child.target = "_blank";
        }
      }
      tempTooltip(cm, tip, ts);
      if (c) c();
    }, pos);
  }

  // Maintaining argument hints

  function updateArgHints(ts, cm) {
    closeArgHints(ts);

    if (cm.somethingSelected()) return;
    var state = cm.getTokenAt(cm.getCursor()).state;
    var inner = CodeMirror.innerMode(cm.getMode(), state);
    if (inner.mode.name != "javascript") return;
    var lex = inner.state.lexical;
    if (lex.info != "call") return;

    var ch, argPos = lex.pos || 0, tabSize = cm.getOption("tabSize");
    for (var line = cm.getCursor().line, e = Math.max(0, line - 9), found = false; line >= e; --line) {
      var str = cm.getLine(line), extra = 0;
      for (var pos = 0;;) {
        var tab = str.indexOf("\t", pos);
        if (tab == -1) break;
        extra += tabSize - (tab + extra) % tabSize - 1;
        pos = tab + 1;
      }
      ch = lex.column - extra;
      if (str.charAt(ch) == "(") {found = true; break;}
    }
    if (!found) return;

    var start = Pos(line, ch);
    var cache = ts.cachedArgHints;
    if (cache && cache.doc == cm.getDoc() && cmpPos(start, cache.start) == 0)
      return showArgHints(ts, cm, argPos);

    ts.request(cm, {type: "type", preferFunction: true, end: start}, function(error, data) {
      if (error || !data.type || !(/^fn\(/).test(data.type)) return;
      ts.cachedArgHints = {
        start: start,
        type: parseFnType(data.type),
        name: data.exprName || data.name || "fn",
        guess: data.guess,
        doc: cm.getDoc()
      };
      showArgHints(ts, cm, argPos);
    });
  }

  function showArgHints(ts, cm, pos) {
    closeArgHints(ts);

    var cache = ts.cachedArgHints, tp = cache.type;
    var tip = elt("span", cache.guess ? cls + "fhint-guess" : null,
                  elt("span", cls + "fname", cache.name), "(");
    for (var i = 0; i < tp.args.length; ++i) {
      if (i) tip.appendChild(document.createTextNode(", "));
      var arg = tp.args[i];
      tip.appendChild(elt("span", cls + "farg" + (i == pos ? " " + cls + "farg-current" : ""), arg.name || "?"));
      if (arg.type != "?") {
        tip.appendChild(document.createTextNode(":\u00a0"));
        tip.appendChild(elt("span", cls + "type", arg.type));
      }
    }
    tip.appendChild(document.createTextNode(tp.rettype ? ") ->\u00a0" : ")"));
    if (tp.rettype) tip.appendChild(elt("span", cls + "type", tp.rettype));
    var place = cm.cursorCoords(null, "page");
    var tooltip = ts.activeArgHints = makeTooltip(place.right + 1, place.bottom, tip)
    setTimeout(function() {
      tooltip.clear = onEditorActivity(cm, function() {
        if (ts.activeArgHints == tooltip) closeArgHints(ts) })
    }, 20)
  }

  function parseFnType(text) {
    var args = [], pos = 3;

    function skipMatching(upto) {
      var depth = 0, start = pos;
      for (;;) {
        var next = text.charAt(pos);
        if (upto.test(next) && !depth) return text.slice(start, pos);
        if (/[{\[\(]/.test(next)) ++depth;
        else if (/[}\]\)]/.test(next)) --depth;
        ++pos;
      }
    }

    // Parse arguments
    if (text.charAt(pos) != ")") for (;;) {
      var name = text.slice(pos).match(/^([^, \(\[\{]+): /);
      if (name) {
        pos += name[0].length;
        name = name[1];
      }
      args.push({name: name, type: skipMatching(/[\),]/)});
      if (text.charAt(pos) == ")") break;
      pos += 2;
    }

    var rettype = text.slice(pos).match(/^\) -> (.*)$/);

    return {args: args, rettype: rettype && rettype[1]};
  }

  // Moving to the definition of something

  function jumpToDef(ts, cm) {
    function inner(varName) {
      var req = {type: "definition", variable: varName || null};
      var doc = findDoc(ts, cm.getDoc());
      ts.server.request(buildRequest(ts, doc, req), function(error, data) {
        if (error) return showError(ts, cm, error);
        if (!data.file && data.url) { window.open(data.url); return; }

        if (data.file) {
          var localDoc = ts.docs[data.file], found;
          if (localDoc && (found = findContext(localDoc.doc, data))) {
            ts.jumpStack.push({file: doc.name,
                               start: cm.getCursor("from"),
                               end: cm.getCursor("to")});
            moveTo(ts, doc, localDoc, found.start, found.end);
            return;
          }
        }
        showError(ts, cm, "Could not find a definition.");
      });
    }

    if (!atInterestingExpression(cm))
      dialog(cm, "Jump to variable", function(name) { if (name) inner(name); });
    else
      inner();
  }

  function jumpBack(ts, cm) {
    var pos = ts.jumpStack.pop(), doc = pos && ts.docs[pos.file];
    if (!doc) return;
    moveTo(ts, findDoc(ts, cm.getDoc()), doc, pos.start, pos.end);
  }

  function moveTo(ts, curDoc, doc, start, end) {
    doc.doc.setSelection(start, end);
    if (curDoc != doc && ts.options.switchToDoc) {
      closeArgHints(ts);
      ts.options.switchToDoc(doc.name, doc.doc);
    }
  }

  // The {line,ch} representation of positions makes this rather awkward.
  function findContext(doc, data) {
    var before = data.context.slice(0, data.contextOffset).split("\n");
    var startLine = data.start.line - (before.length - 1);
    var start = Pos(startLine, (before.length == 1 ? data.start.ch : doc.getLine(startLine).length) - before[0].length);

    var text = doc.getLine(startLine).slice(start.ch);
    for (var cur = startLine + 1; cur < doc.lineCount() && text.length < data.context.length; ++cur)
      text += "\n" + doc.getLine(cur);
    if (text.slice(0, data.context.length) == data.context) return data;

    var cursor = doc.getSearchCursor(data.context, 0, false);
    var nearest, nearestDist = Infinity;
    while (cursor.findNext()) {
      var from = cursor.from(), dist = Math.abs(from.line - start.line) * 10000;
      if (!dist) dist = Math.abs(from.ch - start.ch);
      if (dist < nearestDist) { nearest = from; nearestDist = dist; }
    }
    if (!nearest) return null;

    if (before.length == 1)
      nearest.ch += before[0].length;
    else
      nearest = Pos(nearest.line + (before.length - 1), before[before.length - 1].length);
    if (data.start.line == data.end.line)
      var end = Pos(nearest.line, nearest.ch + (data.end.ch - data.start.ch));
    else
      var end = Pos(nearest.line + (data.end.line - data.start.line), data.end.ch);
    return {start: nearest, end: end};
  }

  function atInterestingExpression(cm) {
    var pos = cm.getCursor("end"), tok = cm.getTokenAt(pos);
    if (tok.start < pos.ch && tok.type == "comment") return false;
    return /[\w)\]]/.test(cm.getLine(pos.line).slice(Math.max(pos.ch - 1, 0), pos.ch + 1));
  }

  // Variable renaming

  function rename(ts, cm) {
    var token = cm.getTokenAt(cm.getCursor());
    if (!/\w/.test(token.string)) return showError(ts, cm, "Not at a variable");
    dialog(cm, "New name for " + token.string, function(newName) {
      ts.request(cm, {type: "rename", newName: newName, fullDocs: true}, function(error, data) {
        if (error) return showError(ts, cm, error);
        applyChanges(ts, data.changes);
      });
    });
  }

  function selectName(ts, cm) {
    var name = findDoc(ts, cm.doc).name;
    ts.request(cm, {type: "refs"}, function(error, data) {
      if (error) return showError(ts, cm, error);
      var ranges = [], cur = 0;
      var curPos = cm.getCursor();
      for (var i = 0; i < data.refs.length; i++) {
        var ref = data.refs[i];
        if (ref.file == name) {
          ranges.push({anchor: ref.start, head: ref.end});
          if (cmpPos(curPos, ref.start) >= 0 && cmpPos(curPos, ref.end) <= 0)
            cur = ranges.length - 1;
        }
      }
      cm.setSelections(ranges, cur);
    });
  }

  var nextChangeOrig = 0;
  function applyChanges(ts, changes) {
    var perFile = Object.create(null);
    for (var i = 0; i < changes.length; ++i) {
      var ch = changes[i];
      (perFile[ch.file] || (perFile[ch.file] = [])).push(ch);
    }
    for (var file in perFile) {
      var known = ts.docs[file], chs = perFile[file];;
      if (!known) continue;
      chs.sort(function(a, b) { return cmpPos(b.start, a.start); });
      var origin = "*rename" + (++nextChangeOrig);
      for (var i = 0; i < chs.length; ++i) {
        var ch = chs[i];
        known.doc.replaceRange(ch.text, ch.start, ch.end, origin);
      }
    }
  }

  // Generic request-building helper

  function buildRequest(ts, doc, query, pos) {
    var files = [], offsetLines = 0, allowFragments = !query.fullDocs;
    if (!allowFragments) delete query.fullDocs;
    if (typeof query == "string") query = {type: query};
    query.lineCharPositions = true;
    if (query.end == null) {
      query.end = pos || doc.doc.getCursor("end");
      if (doc.doc.somethingSelected())
        query.start = doc.doc.getCursor("start");
    }
    var startPos = query.start || query.end;

    if (doc.changed) {
      if (doc.doc.lineCount() > bigDoc && allowFragments !== false &&
          doc.changed.to - doc.changed.from < 100 &&
          doc.changed.from <= startPos.line && doc.changed.to > query.end.line) {
        files.push(getFragmentAround(doc, startPos, query.end));
        query.file = "#0";
        var offsetLines = files[0].offsetLines;
        if (query.start != null) query.start = Pos(query.start.line - -offsetLines, query.start.ch);
        query.end = Pos(query.end.line - offsetLines, query.end.ch);
      } else {
        files.push({type: "full",
                    name: doc.name,
                    text: docValue(ts, doc)});
        query.file = doc.name;
        doc.changed = null;
      }
    } else {
      query.file = doc.name;
    }
    for (var name in ts.docs) {
      var cur = ts.docs[name];
      if (cur.changed && cur != doc) {
        files.push({type: "full", name: cur.name, text: docValue(ts, cur)});
        cur.changed = null;
      }
    }

    return {query: query, files: files};
  }

  function getFragmentAround(data, start, end) {
    var doc = data.doc;
    var minIndent = null, minLine = null, endLine, tabSize = 4;
    for (var p = start.line - 1, min = Math.max(0, p - 50); p >= min; --p) {
      var line = doc.getLine(p), fn = line.search(/\bfunction\b/);
      if (fn < 0) continue;
      var indent = CodeMirror.countColumn(line, null, tabSize);
      if (minIndent != null && minIndent <= indent) continue;
      minIndent = indent;
      minLine = p;
    }
    if (minLine == null) minLine = min;
    var max = Math.min(doc.lastLine(), end.line + 20);
    if (minIndent == null || minIndent == CodeMirror.countColumn(doc.getLine(start.line), null, tabSize))
      endLine = max;
    else for (endLine = end.line + 1; endLine < max; ++endLine) {
      var indent = CodeMirror.countColumn(doc.getLine(endLine), null, tabSize);
      if (indent <= minIndent) break;
    }
    var from = Pos(minLine, 0);

    return {type: "part",
            name: data.name,
            offsetLines: from.line,
            text: doc.getRange(from, Pos(endLine, end.line == endLine ? null : 0))};
  }

  // Generic utilities

  var cmpPos = CodeMirror.cmpPos;

  function elt(tagname, cls /*, ... elts*/) {
    var e = document.createElement(tagname);
    if (cls) e.className = cls;
    for (var i = 2; i < arguments.length; ++i) {
      var elt = arguments[i];
      if (typeof elt == "string") elt = document.createTextNode(elt);
      e.appendChild(elt);
    }
    return e;
  }

  function dialog(cm, text, f) {
    if (cm.openDialog)
      cm.openDialog(text + ": <input type=text>", f);
    else
      f(prompt(text, ""));
  }

  // Tooltips

  function tempTooltip(cm, content, ts) {
    if (cm.state.ternTooltip) remove(cm.state.ternTooltip);
    var where = cm.cursorCoords();
    var tip = cm.state.ternTooltip = makeTooltip(where.right + 1, where.bottom, content);
    function maybeClear() {
      old = true;
      if (!mouseOnTip) clear();
    }
    function clear() {
      cm.state.ternTooltip = null;
      if (tip.parentNode) fadeOut(tip)
      clearActivity()
    }
    var mouseOnTip = false, old = false;
    CodeMirror.on(tip, "mousemove", function() { mouseOnTip = true; });
    CodeMirror.on(tip, "mouseout", function(e) {
      var related = e.relatedTarget || e.toElement
      if (!related || !CodeMirror.contains(tip, related)) {
        if (old) clear();
        else mouseOnTip = false;
      }
    });
    setTimeout(maybeClear, ts.options.hintDelay ? ts.options.hintDelay : 1700);
    var clearActivity = onEditorActivity(cm, clear)
  }

  function onEditorActivity(cm, f) {
    cm.on("cursorActivity", f)
    cm.on("blur", f)
    cm.on("scroll", f)
    cm.on("setDoc", f)
    return function() {
      cm.off("cursorActivity", f)
      cm.off("blur", f)
      cm.off("scroll", f)
      cm.off("setDoc", f)
    }
  }

  function makeTooltip(x, y, content) {
    var node = elt("div", cls + "tooltip", content);
    node.style.left = x + "px";
    node.style.top = y + "px";
    document.body.appendChild(node);
    return node;
  }

  function remove(node) {
    var p = node && node.parentNode;
    if (p) p.removeChild(node);
  }

  function fadeOut(tooltip) {
    tooltip.style.opacity = "0";
    setTimeout(function() { remove(tooltip); }, 1100);
  }

  function showError(ts, cm, msg) {
    if (ts.options.showError)
      ts.options.showError(cm, msg);
    else
      tempTooltip(cm, String(msg), ts);
  }

  function closeArgHints(ts) {
    if (ts.activeArgHints) {
      if (ts.activeArgHints.clear) ts.activeArgHints.clear()
      remove(ts.activeArgHints)
      ts.activeArgHints = null
    }
  }

  function docValue(ts, doc) {
    var val = doc.doc.getValue();
    if (ts.options.fileFilter) val = ts.options.fileFilter(val, doc.name, doc.doc);
    return val;
  }

  // Worker wrapper

  function WorkerServer(ts) {
    var worker = ts.worker = new Worker(ts.options.workerScript);
    worker.postMessage({type: "init",
                        defs: ts.options.defs,
                        plugins: ts.options.plugins,
                        scripts: ts.options.workerDeps});
    var msgId = 0, pending = {};

    function send(data, c) {
      if (c) {
        data.id = ++msgId;
        pending[msgId] = c;
      }
      worker.postMessage(data);
    }
    worker.onmessage = function(e) {
      var data = e.data;
      if (data.type == "getFile") {
        getFile(ts, data.name, function(err, text) {
          send({type: "getFile", err: String(err), text: text, id: data.id});
        });
      } else if (data.type == "debug") {
        window.console.log(data.message);
      } else if (data.id && pending[data.id]) {
        pending[data.id](data.err, data.body);
        delete pending[data.id];
      }
    };
    worker.onerror = function(e) {
      for (var id in pending) pending[id](e);
      pending = {};
    };

    this.addFile = function(name, text) { send({type: "add", name: name, text: text}); };
    this.delFile = function(name) { send({type: "del", name: name}); };
    this.request = function(body, c) { send({type: "req", body: body}, c); };
  }
});

//= require "../vendor/codemirror2/codemirror"
//= require "../vendor/codemirror2/xml"
//= require "../vendor/codemirror2/css"
//= require "../vendor/codemirror2/javascript"
//= require "../vendor/codemirror2/htmlmixed"
//= require "../vendor/codemirror2/searchcursor"

define('skylark-jsbin-coder/editors/codemirror',[
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

define('skylark-jsbin-coder/editors/mobileCodeMirror',[
  "skylark-jquery",
  "skylark-jsbin-chrome/hideOpen",
   "../jsbin",
   "./codemirror"
],function ($,hideOpen, jsbin,CodeMirror) {
  /* globals jsbin, throttle, $, $body, CodeMirror, $document */
  var noop = function () {};
  var rootClassName = document.body.className;
  var oldCodeMirror = null;

  var simple = jsbin.settings.editor && jsbin.settings.editor.simple;

  if (simple ||
      jsbin.mobile ||
      jsbin.tablet ||
      rootClassName.indexOf('ie6') !== -1 ||
      rootClassName.indexOf('ie7') !== -1) {
    $('body').addClass('mobile');
    enableMobileMirror();
  }

  function enableMobileMirror() {
    var re = /\b./g;
    jsbin.lameEditor = true;

    var setCursor = function (sPos, ePos) {
      if (!ePos) {
        ePos = sPos;
      }
      var field = this.textarea;
      var value = field.value;
      field.value = ''; // hack to reset the cursor position
      field.value = value;
      if (field.setSelectionRange) {
        field.setSelectionRange(sPos, ePos);
      } else if (field.createTextRange) {
        var range = field.createTextRange();
        range.collapse(true);
        if (sPos < 0) {
          sPos = field.value.length + sPos;
        }
        range.moveEnd('character', ePos);
        range.moveStart('character', sPos);
        range.select();
      }
    }

    var insert = function (value, from, to) {
      var field = this.textarea;
      if (value === undefined || value === null) {
        value = '';
      }

      if (!from) {
        from = this.getCursor();
      }

      if (!to) {
        to = from;
        if (this.textarea.selectionEnd !== this.textarea.selectionStart) {
          to = this.posFromIndex(this.textarea.selectionEnd);
        }
      }

      var prev = field.value;
      var lines = field.value.split('\n');
      var line = lines[from.line];
      line = line.substring(0, from.ch) + value + line.substring(to.ch);
      lines[from.line] = line;

      field.value = lines.join('\n');

      var endPos = lines.slice(0, from.line).join('\n').length + 1 + from.ch + value.length; // +1 for missing ln
      //lines.slice(0, from.line - 1).join('\n').length + value.length + to.ch - 1;

      setCursor.call({ textarea: field }, endPos);
    };

    var Editor = function (el, options) {
      this.textarea = el;
      this.win = { document: this.textarea };
      this.ready = true;
      this.wrapping = document.createElement('div');

      var textareaParent = this.textarea.parentNode;
      this.wrapping.appendChild(this.textarea);
      textareaParent.appendChild(this.wrapping);

      this.textarea.style.opacity = 1;
      // this.textarea.style.width = '100%';

      var eventName = jsbin.mobile || jsbin.tablet ? 'blur' : 'keyup';
      var old = null;

      var update = function () {
        if (old !== el.value) {
          old = el.value;
          $document.trigger('codeChange', { panelId: el.id });
        }
      };

      $document.on('jsbinReady', function () {
        old = el.value;
      });

      $(this.textarea)
        .on(eventName, jsbin.throttle(function () {
          update();
          jsbin.$body.removeClass('editor-focus');
        }, 200))
        .on('focus', function () {
          hideOpen();
          jsbin.$body.addClass('editor-focus');
        })
        .on('touchstart', function () {
          completionIndex = -1; // reset the completion
        })
        .on('keypress', function () {
          completionIndex = -1; // reset the completion
        });

      if (options.initCallback) {
        $(options.initCallback);
      }

      this.commands = {};
      this.options = options;

      this.__update = update;
    };

    var completionIndex = -1;
    var completionCache = [];
    var lastToken = null;

    Editor.prototype = {
      _hasCompletions: function () {
        return completionIndex !== -1;
      },
      _completionIndex: completionIndex,
      _showCompletion: function (completions, token) {
        if (completionIndex === -1) {
          // reset
          console.log(completions);
          completionCache = completions;
          lastToken = token;
          console.log(token);
        }

        // else, show the next completion
        completionIndex++;
        if (completionIndex >= completionCache.length) {
          completionIndex = 0;
        }
        var pos = this.getCursor();
        var i = this.indexFromPos(pos);
        var value = completionCache[completionIndex].substr(lastToken.string.length);
        insert.call(this, value);
        this.setCursor(i, i + value.length); // highlight the section

        return;
      },
      cursorCoords: function (from) {
        var pos = getCaretCoordinates(this.textarea, this.textarea.selectionEnd);
        pos.bottom = pos.top; // hack for CM
        return pos;
      },
      replaceRange: function () {
        this._completionIndex = -1;
        return insert.apply(this, arguments);
      },
      getMode: function () {
        return this.options.mode;
      },
      Pos: function (line, ch) {
        return {
          line: line,
          ch: ch,
        };
      },
      getWrapperElement: function () {
        return this.wrapping;
      },
      getScrollerElement: function () {
        return this.textarea;
      },
      setOption: function (type, handler) {
        if (type === 'onChange') {
          $(this.textarea).change(handler);
        }
      },
      setCode: function (code) {
        this.textarea.value = code;
      },
      getOption: noop,
      getCode: function () {
        return this.textarea.value;
      },
      getLine: function (n) {
        return this.textarea.value.split('\n')[n - 1];
      },
      getValue: function () {
        return this.textarea.value;
      },
      setValue: function (code)  {
        this.textarea.value = code;
      },
      focus: function () {
        this.textarea.focus();
      },
      getCursor: function () {
        var p = this.cursorPosition().character;
        var lines = this.textarea.value.substring(0, p).split('\n');
        var line = lines.length - 1;
        var char = lines[line].length;
        return {
          line: line,
          char: char,
          ch: char,
        };
      },
      getTokenAt: function (pos) {
        var line = this.textarea.value.split('\n')[pos.line];
        var frag = line.substr(0, pos.char);
        var start = -1;
        line.replace(re, function (m, i) {
          if (line.substr(i).trim()) { // ignore the end of the line
            start = i;
          }
        });

        //var start = (re.exec(line.substr(0, pos.char)) || { index: -1 }).index + 1;
        var end = (re.exec(line.substr(pos.char)) || { index: line.length }).index;
        var string = line.substr(start, end);

        // TODO validate string is made up entirely of \w characters
        if (!(/^\w+$/g).test(string)) {
          string = '';
        }

        return {
          start: start,
          end: end,
          string: string.trim(),
          type: 'variable',
          state: {
            mode: this.options.mode,
          },
        };
      },
      setCursor: setCursor,
      currentLine: function () {
        return 0;
      },
      defaultTextHeight: function () {
        return 16;
      },
      highlightLines: function () {
        return {
          string: '',
        };
      },
      removeKeyMap: noop,
      addKeyMap: noop,
      indentLine: noop,
      cursorPosition: function () {
        var character = 0;
        if (this.textarea.selectionStart) {
          character = this.textarea.selectionStart;
        } else if (this.textarea.createTextRange) {
          var range = this.textarea.createTextRange();
          character = range.startOffset;
        }
        return { character: character };
      },
      nthLine: noop,
      refresh: noop,
      selectLines: noop,
      on: noop,
      somethingSelected: noop,
      indexFromPos: function (pos) {
        var lines = this.textarea.value.split('\n');
        return lines.slice(0, pos.line).join('').length + pos.ch + pos.line;
      },
      posFromIndex: function (i) {
        var lines = this.textarea.value.substr(0, i).split('\n');
        var line = lines.length - 1;
        return {
          line: line,
          ch: lines[line].length,
        };
      },
      getRange: function (start, end) {
        return this.textarea.value.substring(this.indexFromPos(start), this.indexFromPos(end));
      },
      getModeAt: function () {
        var name = this.options.mode;
        if (name === 'htmlmixed') {
          name = 'html';
        }
        return { name: name };
      },
      setSelections: function (sel) {
        setCursor.call(this, this.indexFromPos(sel[0].anchor), this.indexFromPos(sel[0].head));
      },
      listSelections: function () {
        return [{
          head: this.getCursor(),
          anchor: this.getCursor(),
        }];
      },
      operation: function (fn) {
        fn();
        // return fn;
      }
    };

    oldCodeMirror = CodeMirror;
    CodeMirror = noop;

    for (var key in oldCodeMirror) {
      CodeMirror[key] = noop;
    }

    // copy across some useful stuff
    ['Pass', 'hint', 'snippets', 'execCommand', 'simpleHint', 'commands'].forEach(function (key) {
      CodeMirror[key] = oldCodeMirror[key];
    });

    CodeMirror.fromTextArea = function (el, options) {
      return new Editor(el, options);
    };

    CodeMirror.keyMap = { basic: {} };
  }
});
define('skylark-jsbin-coder/editors/mobile-command-maps',[
  "skylark-jquery",
   "../jsbin"
],function ($,jsbin) {
  var commandMaps = [
    {
      value: '➠',
      callback: function () { return this.complete(); }
    },
    {
      value: 'fn',
      callback: function () { return 'function $0() {\n  \n}' },
      panel: ['js', 'console']
    },
    {
      value: '($0)',
      panel: ['js', 'console']
    },
    {
      value: '{$0}',
      panel: ['css', 'js'],
      callback: function () {
        return '{\n  $0\n}';
      },
    },
    {
      value: 'log',
      callback: function () { return 'console.log($0)' },
      panel: 'js',
    },
    {
      value: '<$0',
      panel: 'html',
    },
    {
      value: '>$0',
      panel: 'html',
    },
    {
      value: '</>',
      callback: function () { return this.close('>'); },
      panel: 'html',
    },
    {
      value: '="$0"',
      panel: 'html',
    },
    {
      value: '&rarr;|',
      callback: function () {
        return '  $0';
      },
    },
    {
      value: ': "$0";',
      panel: 'css',
    },
  ];


  /**
   * Notes
   *
   * - Undo isn't really possible. I tried it. It was terrible.
   */

   return jsbin.commandMaps = commandMaps;
});
define('skylark-jsbin-coder/chrome/analytics',[
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
/*global jsbin:true, CodeMirror:true */
define('skylark-jsbin-coder/editors/snippets.cm',[
  "skylark-jquery",
   "../jsbin",
   "../coder",
   "./codemirror"
],function ($,jsbin,coder,CodeMirror) {
  'use strict';
  var defaults = {
      cl: 'console.log(\'$0\');',
      fn: 'function $0() {\n\t\n}'
    };

  CodeMirror.snippets = function(cm) {
    var pos = cm.getCursor(),
        tok = cm.getTokenAt(pos),
        targetCursorPos = -1,
        macro = '',
        tagName = tok.string,
        snippets = jsbin.settings.snippets || defaults;

    if (tok.end > pos.ch) {
      tagName = tagName.slice(0, tagName.length - tok.end + pos.ch);
    }
    var key = tagName.toLowerCase();

    if (snippets[key]) {
      targetCursorPos = snippets[key].indexOf('$0');
      macro = snippets[key].replace(/\$0/, '');
      cm.replaceRange(macro,{line: pos.line, ch: pos.ch - key.length}, {line: pos.line, ch: pos.ch + key.length});

      if (targetCursorPos !== -1) {
        cm.setCursor({ line: pos.line, ch: pos.ch - key.length + targetCursorPos });
      }
      return;
    }
    return CodeMirror.Pass;
  };

  return coder.editors.snippets = CodeMirror.snippets;
});
define('skylark-jsbin-chrome/splitter',[
  "skylark-jquery",
  "skylark-jsbin-base/storage",
   "./jsbin",
   "./chrome"
],function ($,store,jsbin,chrome) {
  $.fn.splitter = function () {
    var $document = $(document),
        $blocker = $('<div class="block"></div>'),
        $body = $('body');
        // blockiframe = $blocker.find('iframe')[0];

    var splitterSettings = JSON.parse(store.localStorage.getItem('splitterSettings') || '[]');
    return this.each(function () {
      var $el = $(this),
          $originalContainer = $(this),
          guid = $.fn.splitter.guid++,
          $parent = $el.parent(),
          type = 'x',
          $prev = type === 'x' ? $el.prevAll(':visible:first') : $el.nextAll(':visible:first'),
          $handle = $('<div class="resize"></div>'),
          dragging = false,
          width = $parent.width(),
          parentOffset = $parent.offset(),
          left = parentOffset.left,
          top = parentOffset.top, // usually zero :(
          props = {
            x: {
              currentPos: $parent.offset().left,
              multiplier: 1,
              cssProp: 'left',
              otherCssProp: 'right',
              size: $parent.width(),
              sizeProp: 'width',
              moveProp: 'pageX',
              init: {
                top: 0,
                bottom: 0,
                width: jsbin.mobile ? 44 : 8,
                'margin-left': jsbin.mobile ? '-22px' : '-4px',
                height: '100%',
                left: 'auto',
                right: 'auto',
                opacity: 0,
                position: 'absolute',
                cursor: 'ew-resize',
                // 'border-top': '0',
                'border-left': '1px solid rgba(218, 218, 218, 0.5)',
                'z-index': 99999
              }
            },
            y: {
              currentPos: $parent.offset().top,
              multiplier: -1,
              size: $parent.height(),
              cssProp: 'bottom',
              otherCssProp: 'top',
              sizeProp: 'height',
              moveProp: 'pageY',
              init: {
                top: 'auto',
                cursor: 'ns-resize',
                bottom: 'auto',
                height: 8,
                width: '100%',
                left: 0,
                right: 0,
                opacity: 0,
                position: 'absolute',
                border: 0,
                // 'border-top': '1px solid rgba(218, 218, 218, 0.5)',
                'z-index': 99999
              }
            }
          },
          refreshTimer = null,
          settings = splitterSettings[guid] || {};

      var tracker = {
        down: { x: null, y: null },
        delta: { x: null, y: null },
        track: false,
        timer: null
      };
      $handle.bind('mousedown', function (event) {
        tracker.down.x = event.pageX;
        tracker.down.y = event.pageY;
        tracker.delta = { x: null, y: null };
        tracker.target = $handle[type == 'x' ? 'height' : 'width']() * 0.25;
      });

      $document.bind('mousemove', function (event) {
        if (dragging) {
          tracker.delta.x = tracker.down.x - event.pageX;
          tracker.delta.y = tracker.down.y - event.pageY;
          clearTimeout(tracker.timer);
          tracker.timer = setTimeout(function () {
            tracker.down.x = event.pageX;
            tracker.down.y = event.pageY;
          }, 250);
          var targetType = type == 'x' ? 'y' : 'x';
          if (Math.abs(tracker.delta[targetType]) > tracker.target) {
            $handle.trigger('change', targetType, event[props[targetType].moveProp]);
            tracker.down.x = event.pageX;
            tracker.down.y = event.pageY;
          }
        }
      });

      function moveSplitter(pos) {
        if (type === 'y') {
          pos -= top;
        }
        var v = pos - props[type].currentPos,
            split = 100 / props[type].size * v,
            delta = (pos - settings[type]) * props[type].multiplier,
            prevSize = $prev[props[type].sizeProp](),
            elSize = $el[props[type].sizeProp]();

        if (type === 'y') {
          split = 100 - split;
        }

        // if prev panel is too small and delta is negative, block
        if (prevSize < 100 && delta < 0) {
          // ignore
        } else if (elSize < 100 && delta > 0) {
          // ignore
        } else {
          // allow sizing to happen
          $el.css(props[type].cssProp, split + '%');
          $prev.css(props[type].otherCssProp, (100 - split) + '%');
          var css = {};
          css[props[type].cssProp] = split + '%';
          $handle.css(css);
          settings[type] = pos;
          splitterSettings[guid] = settings;
          store.localStorage.setItem('splitterSettings', JSON.stringify(splitterSettings));

          // wait until animations have completed!
          if (moveSplitter.timer) clearTimeout(moveSplitter.timer);
          moveSplitter.timer = setTimeout(function () {
            $document.trigger('sizeeditors');
          }, 120);
        }
      }

      function resetPrev() {
        $prev = type === 'x' ? $handle.prevAll(':visible:first') : $handle.nextAll(':visible:first');
      }

      $document.bind('mouseup touchend', function () {
        if (dragging) {
          dragging = false;
          $blocker.remove();
          // $handle.css( 'opacity', '0');
          $body.removeClass('dragging');
        }
      }).bind('mousemove touchmove', function (event) {
        if (dragging) {
          moveSplitter(event[props[type].moveProp] || event.originalEvent.touches[0][props[type].moveProp]);
        }
      });

      $blocker.bind('mousemove touchmove', function (event) {
        if (dragging) {
          moveSplitter(event[props[type].moveProp] || event.originalEvent.touches[0][props[type].moveProp]);
        }
      });

      $handle.bind('mousedown touchstart', function (e) {
        dragging = true;
        $body.append($blocker).addClass('dragging');
        props[type].size = $parent[props[type].sizeProp]();
        props[type].currentPos = 0; // is this really required then?

        resetPrev();
        e.preventDefault();
      });

      /*
      .hover(function () {
        $handle.css('opacity', '1');
      }, function () {
        if (!dragging) {
          $handle.css('opacity', '0');
        }
      })
    */

      $handle.bind('init', function (event, x) {
        $handle.css(props[type].init);
        props[type].size = $parent[props[type].sizeProp]();
        resetPrev();

        // can only be read at init
        top = $parent.offset().top;

        $blocker.css('cursor', type == 'x' ? 'ew-resize' : 'ns-resize');

        if (type == 'y') {
          $el.css('border-right', 0);
          $prev.css('border-left', 0);
          $prev.css('border-top', '2px solid #ccc');
        } else {
          // $el.css('border-right', '1px solid #ccc');
          $el.css('border-top', 0);
          // $prev.css('border-right', '2px solid #ccc');
        }

        if ($el.is(':hidden')) {
          $handle.hide();
        } else {
          if ($prev.length) {
            $el.css('border-' + props[type].cssProp, '1px solid #ccc');
          } else {
            $el.css('border-' + props[type].cssProp, '0');
          }
          moveSplitter(x !== undefined ? x : $el.offset()[props[type].cssProp]);
        }
      }); //.trigger('init', settings.x || $el.offset().left);

      $prev.css('width', 'auto');
      $prev.css('height', 'auto');
      $el.data('splitter', $handle);
      $el.before($handle);

      // if (settings.y) {
      //   $handle.trigger('change', 'y');
      // }
    });
  };

  $.fn.splitter.guid = 0;

  return chrome.splitter = $.fn.splitter;
});
define('skylark-jsbin-coder/editors/panel',[
  "skylark-jquery",
  "skylark-jsbin-base/storage",
  "skylark-jsbin-processors",
  "skylark-jsbin-chrome/hideOpen",
   "../jsbin",
   "../coder",
  "./codemirror",
  "../chrome/analytics",
  "./snippets.cm",
  "skylark-jsbin-chrome/splitter"
],function ($,store,processors,hideOpen, jsbin,coder,CodeMirror,analytics) {
  /*globals $, CodeMirror, jsbin, jshintEnabled, */
  var $document = $(document),
      $source = $('#source'),
      userResizeable = !$('html').hasClass('layout');

  var editorModes = {
    html: 'htmlmixed',
    javascript: 'javascript',
    css: 'css',
    typescript: 'javascript',
    markdown: 'markdown',
    coffeescript: 'coffeescript',
    livescript: 'text/x-livescript',
    jsx: 'javascript',
    less: 'text/x-less',
    sass: 'text/x-sass',
    scss: 'text/x-scss',
    processing: 'text/x-csrc',
    jade: 'text/x-jade',
    clojurescript: 'clojure'
  };

  var badChars = new RegExp('[\u200B\u0080-\u00a0]', 'g');

  if (jsbin.settings.editor.tabMode === 'default') {
    CodeMirror.keyMap.basic.Tab = undefined;
  } else if (jsbin.settings.editor.tabMode !== 'classic') {
    CodeMirror.keyMap.basic.Tab = 'indentMore';
  }

  if (!CodeMirror.commands) {
    CodeMirror.commands = {};
  }

  // Save a reference to this autocomplete function to use it when Tern scripts
  // are loaded but not used, since they will automatically overwrite the
  // CodeMirror autocomplete function with CodeMirror.showHint
  var simpleJsHint = function(cm) {
    if (CodeMirror.snippets(cm) === CodeMirror.Pass) {
      return CodeMirror.simpleHint(cm, CodeMirror.hint.javascript);
    }
  };

  CodeMirror.commands.autocomplete = simpleJsHint;

  CodeMirror.commands.snippets = function (cm) {
    'use strict';
    if (['htmlmixed', 'javascript', 'css', editorModes['less'], editorModes['sass'], editorModes['scss']].indexOf(cm.options.mode) === -1) {
      return CodeMirror.simpleHint(cm, CodeMirror.hint.anyword);
    } else if (oldCodeMirror) {
      return oldCodeMirror.snippets(cm);
    } else if (!jsbin.mobile) {
      return CodeMirror.snippets(cm);
    }
  };

  var Panel = function (name, settings) {
    'use strict';
    var panel = this,
        showPanelButton = true,
        $panel = null,
        splitterSettings = {},
        cmSettings = {},
        panelLanguage = name,
        $panelwrapper = $('<div class="stretch panelwrapper"></div>');

    panel.settings = settings = settings || {};
    panel.id = panel.name = name;
    $panel = $('.panel.' + name);
    $panel.data('name', name);
    panel.$el = $panel.detach();
    panel.$el.appendTo($panelwrapper);
    $panelwrapper.appendTo($source);
    panel.$panel = panel.$el;
    panel.$el = panel.$el.parent().hide();
    panel.el = document.getElementById(name);
    panel.order = ++Panel.order;

    panel.label = (settings.label || name);

    panel.$el.data('panel', panel);

    this._eventHandlers = {};

    panel.on('show', panels.updateQuery);
    panel.on('hide', panels.updateQuery);

    // keyboard shortcut (set in keyboardcontrol.js)
    // panelShortcuts[panelShortcuts.start + panel.order] = panel.id; //TODO:

    if (panel.order === 1) {
      settings.nosplitter = true;
    }

    if (settings.editor) {
      cmSettings = {
        parserfile: [],
        readOnly: jsbin.state.embed ? 'nocursor' : false,
        dragDrop: false, // we handle it ourselves
        mode: editorModes[panelLanguage],
        ///lineWrapping: false,
        // gutters: ['line-highlight'],
        theme: jsbin.settings.theme || 'jsbin',
        highlightLine: true,

        lineNumbers: true,
        lineWrapping: true,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]

      };

      $.extend(cmSettings, jsbin.settings.editor || {});

      cmSettings.extraKeys = {};

      // only the js panel for now, I'd like this to work in
      // the HTML panel too, but only when you were in JS scope
      if (name === 'javascript') {
        cmSettings.extraKeys.Tab = 'autocomplete';
      } else {
        cmSettings.extraKeys.Tab = 'snippets';
      }


      if (name === 'html') {
        // some emmet "stuff" - TODO decide whether this is needed still...
        $.extend(cmSettings, {
          syntax: name, // define Zen Coding syntax
          profile: name, // define Zen Coding output profile
        });
      }

      // make sure tabSize and indentUnit are numbers
      if (typeof cmSettings.tabSize === 'string') {
        cmSettings.tabSize = parseInt(cmSettings.tabSize, 10) || 2;
      }
      if (typeof cmSettings.indentUnit === 'string') {
        cmSettings.indentUnit = parseInt(cmSettings.indentUnit, 10) || 2;
      }

      panel.editor = CodeMirror.fromTextArea(panel.el, cmSettings);

      ///if (name === 'html' || name === 'css') {
      ///  delete emmetCodeMirror.defaultKeymap['Cmd-D'];
      ///  delete emmetCodeMirror.defaultKeymap['Ctrl-D'];
      ///  emmetCodeMirror(panel.editor);
      ///}

      panel.editor.on('highlightLines', function () {
        window.location.hash = panels.getHighlightLines();
      });

      // Bind events using CM3 syntax
      panel.editor.on('change', function codeChange(cm, changeObj) {
        if (jsbin.saveDisabled) {
          $document.trigger('codeChange.live', [{ panelId: panel.id, revert: true, origin: changeObj.origin }]);
        } else {
          $document.trigger('codeChange', [{ panelId: panel.id, revert: true, origin: changeObj.origin }]);
        }
        return true;
      });

      panel.editor.on('focus', function () {
        panel.focus();
      });

      // Restore keymaps taken by emmet but that we need for other functionalities
      if (name === 'javascript') {
        var cmd = $.browser.platform === 'mac' ? 'Cmd' : 'Ctrl';
        var map = {};
        map[cmd + '-D'] = 'deleteLine';
        map[cmd + '-/'] = function(cm) { CodeMirror.commands.toggleComment(cm); };
        map.name = 'noEmmet';
        panel.editor.addKeyMap(map);
      }

      panel._setupEditor(panel.editor, name);
    }

    if ($('html').is('.layout')) {
      panel.splitter = $();
      panel.$el.removeClass('stretch');
    } else if (!settings.nosplitter) {
      panel.splitter = panel.$el.splitter(splitterSettings).data('splitter');
      panel.splitter.hide();
    } else {
      // create a fake splitter to let the rest of the code work
      panel.splitter = $();
    }

    if (jsbin.state.processors && jsbin.state.processors[name]) {
      panelLanguage = jsbin.state.processors[name];
      processors.set(panel, jsbin.state.processors[name]);
    } else if (settings.processor) { // FIXME is this even used?
      panelLanguage = settings.processors[settings.processor];
      processors.set(panel, settings.processor);
    } else if (processors[panel.id]) {
      processors.set(panel, panel.id);
    } else {
      // this is just a dummy function for console & output...which makes no sense...
      panel.processor = function (str) {
        return new Promise(function (resolve) {
          resolve(str);
        });
      };

    }

    if (settings.beforeRender) {
      $document.bind('render', $.proxy(settings.beforeRender, panel));
    }

    if (!settings.editor) {
      panel.ready = true;
    }

    // append panel to controls
    if (jsbin.state.embed) {
      // showPanelButton = window.location.search.indexOf(panel.id) !== -1;
    }

    if (showPanelButton) {
      this.controlButton = $('<a role="button" class="button group" href="?' + name + '">' + panel.label + '</a>');
      this.updateAriaState();

      this.controlButton.on('click touchstart', function () {
        panel.toggle();
        return false;
      });
      this.controlButton.appendTo('#panels');
    }

    $panel.focus(function () {
      panel.focus();
    });
    if (!jsbin.mobile) {
      $panel.add(this.$el.find('.label')).click(function () {
        panel.focus();
      });
    }
  };

  Panel.order = 0;

  Panel.prototype = {
    virgin: true,
    visible: false,
    updateAriaState: function updateAriaState() {
      this.controlButton.attr('aria-label', this.label + ' Panel: ' + (this.visible ? 'Active' : 'Inactive'));
    },
    show: function show(x) {
      hideOpen();
      if (this.visible) {
        return;
      }
      $document.trigger('history:close');
      // check to see if there's a panel to the left.
      // if there is, take it's size/2 and make this our
      // width
      var panel = this,
          panelCount = panel.$el.find('.panel').length;

      analytics.showPanel(panel.id);

      if (jsbin.mobile) {
        panels.hideAll(true);
      }

      if (panel.splitter.length) {
        if (panelCount === 0 || panelCount > 1) {
          var $panel = $('.panel.' + panel.id).show();
          // $panel.next().show(); // should be the splitter...
          $panel.closest('.panelwrapper').show();
        } else {
          panel.$el.show();
        }
        panel.splitter.show();
      } else {
        panel.$el.show();
      }

      jsbin.$body.addClass('panelsVisible');

      if (panel.settings.show) {
        panel.settings.show.call(panel, true);
      }
      panel.controlButton.addClass('active');
      panel.visible = true;
      this.updateAriaState();


      // if the textarea is in focus AND we're mobile AND the keyboard is up
      if (jsbin.mobile && window.matchMedia && window.matchMedia('(max-height: 410px) and (max-width: 640px)').matches) {
        if (panel.editor) panel.editor.focus();
      }

      if (jsbin.mobile) {
        panel.focus();
        panel.trigger('show');
        return;
      }

      // update the splitter - but do it on the next tick
      // required to allow the splitter to see it's visible first
      setTimeout(function () {
        if (userResizeable) {
          if (x !== undefined) {
            panel.splitter.trigger('init', x);
          } else {
            panel.distribute();
          }
        }
        if (panel.editor) {
          // populate the panel for the first time
          if (panel.virgin) {
            var top = panel.$el.find('.label').outerHeight();
            top += 8;

            if (!jsbin.mobile) {
              $(panel.editor.scroller).find('.CodeMirror-lines').css('padding-top', top);
            }

            populateEditor(panel, panel.name);
          }
          if (!panel.virgin || coder.editors.panels.ready) {
            panel.editor.focus();
            panel.focus();
          }
          if (panel.virgin) {
            if (panel.settings.init) {
              setTimeout(function () {
                panel.settings.init.call(panel);
              }, 10);
            }
          }
        } else {
          panel.focus();
        }
        // update all splitter positions
        $document.trigger('sizeeditors');

        panel.trigger('show');

        panel.virgin = false;
      }, 0);

      // TODO save which panels are visible in their profile - but check whether it's their code
    },
    hide: function (fromShow) {
      var panel = this;
      // panel.$el.hide();
      panel.visible = false;
      this.updateAriaState();

      if (!fromShow) {
        analytics.hidePanel(panel.id);
      } else if (panel.editor) {
        getRenderedCode[panel.id] = getRenderedCode.render(panel.id);
      }

      // update all splitter positions
      // LOGIC: when you go to hide, you need to check if there's
      // other panels inside the panel wrapper - if there are
      // hide the nested panel and any previous visible splitter
      // if there's only one - then hide the whole thing.
      // if (panel.splitter.length) {
      var panelCount = panel.$el.find('.panel').length;
      if (panelCount === 0 || panelCount > 1) {
        var $panel = $('.panel.' + panel.id).hide();
        $panel.prev().hide(); // hide the splitter if there is one

        // TODO trigger a distribute horizontally
        if ($panel.closest('.panelwrapper').find('.panel:visible').length === 0) {
          $panel.closest('.panelwrapper').hide();
          // panel.splitter.hide();
          // TODO FIXME
        }
      } else {
        panel.$el.hide();
        panel.splitter.hide();
      }


      if (panel.editor) {
        panel.controlButton.toggleClass('hasContent', !!this.getCode().trim().length);
      }

      panel.controlButton.removeClass('active');

      if (panel.settings.hide) {
        panel.settings.hide.call(panel, true);
      }

      var visible = coder.editors.panels.getVisible();
      if (visible.length) {
        coder.editors.panels.focused = visible[0];
        if (coder.editors.panels.focused.editor) {
          coder.editors.panels.focused.editor.focus();
        } else {
          coder.editors.panels.focused.$el.focus();
        }
        coder.editors.panels.focused.focus();
      }

      if (!fromShow && jsbin.mobile && visible.length === 0) {
        $document.trigger('history:load');
        $('#history').show();
        setTimeout(function () {
          $body.removeClass('panelsVisible');
        }, 100); // 100 is on purpose to add to the effect of the reveal
      }

      panel.trigger('hide');

      if (fromShow) {
        return;
      }

      panel.distribute();
      $document.trigger('sizeeditors');

      // note: the history:open does first check whether there's an open panels
      // and if there are, it won't show the history, it'll just ignore the event
      $document.trigger('history:open');
    },
    toggle: function () {
      (this)[this.visible ? 'hide' : 'show']();
    },
    getCode: function () {
      if (this.editor) {
        badChars.lastIndex = 0;
        return this.editor.getCode().replace(badChars, '');
      }
    },
    setCode: function (content) {
      if (this.editor) {
        if (content === undefined) {
          content = '';
        }
        this.controlButton.toggleClass('hasContent', !!content.trim().length);
        this.codeSet = true;
        this.editor.setCode(content.replace(badChars, ''));
      }
    },
    codeSet: false,
    blur: function () {
      this.$panel.addClass('blur');
    },
    focus: function () {
      this.$panel.removeClass('blur');
      coder.editors.panels.focus(this);
    },
    render: function () {
      'use strict';
      var args = [].slice.call(arguments);
      var panel = this;
      return new Promise(function (resolve, reject) {
        if (panel.editor) {
          panel.processor(panel.getCode()).then(resolve, reject);
        } else if (panel.visible && panel.settings.render) {
          if (coder.editors.panels.ready) {
            panel.settings.render.apply(panel, args);
          }
          resolve();
        }
      });
    },
    init: function () {
      if (this.settings.init) this.settings.init.call(this);
    },
    _setupEditor: function () {
      var focusedPanel = store.sessionStorage.getItem('panel') || jsbin.settings.focusedPanel,
          panel = this,
          editor = panel.editor;

      // overhang from CodeMirror1
      editor.setCode = function (str) {
        //Cannot call method 'chunkSize' of undefined
        try {
          editor.setValue(str);
        } catch(err) {
          // console.error(panel.id, err);
        }
      };


      editor.getCode = function () {
        return editor.getValue();
      };

      editor.currentLine = function () {
        var pos = editor.getCursor();
        return pos.line;
      };

      // editor.setOption('onKeyEvent', keycontrol);
      // editor.setOption('onFocus', function () {
        // panel.$el.trigger('focus');
      // });

      // This prevents the browser from jumping
      if (jsbin.embed) {
        editor._focus = editor.focus;
        editor.focus = function () {
          // console.log('ignoring manual call');
        };
      }

      editor.id = panel.name;

      editor.win = editor.getWrapperElement();
      editor.scroller = $(editor.getScrollerElement());

      var $label = panel.$el.find('.label');
      if (document.body.className.indexOf('ie6') === -1 && $label.length) {
        editor.on('scroll', function (event) {
          var scrollInfo = editor.getScrollInfo();
          if (scrollInfo.top > 10) {
            $label.stop().animate({ opacity: 0 }, 20, function () {
              $(this).hide();
            });
          } else {
            $label.show().stop().animate({ opacity: 1 }, 150);
          }
        });
      }

      var $error = null;
      $document.bind('sizeeditors', function () {
        if (panel.visible) {
          var height = panel.editor.scroller.closest('.panel').outerHeight();
          var offset = 0;
          $error = panel.$el.find('details');
          offset += ($error.filter(':visible').height() || 0);

          if (!jsbin.lameEditor) {
            editor.scroller.height(height - offset);
          }
          try { editor.refresh(); } catch (e) {}

          setTimeout(function () {
            $source[0].style.paddingLeft = '1px';
            setTimeout(function () {
              $source[0].style.paddingLeft = '0';
            }, 0);
          }, 0);
        }
      });

      // required because the populate looks at the height, and at
      // this point in the code, the editor isn't visible, the browser
      // needs one more tick and it'll be there.
      setTimeout(function () {
        // if the panel isn't visible this only has the effect of putting
        // the code in the textarea (though probably costs us a lot more)
        // it has to be re-populated upon show for the first time because
        // it appears that CM2 uses the visible height to work out what
        // should be shown.
        panel.ready = true;
        populateEditor(panel, panel.name);

        if (focusedPanel == panel.name) {
          // another fracking timeout to avoid conflict with other panels firing up
          setTimeout(function () {
            panel.focus();
            if (panel.visible && !jsbin.mobile && !jsbin.tablet) {
              editor.focus();

              var code = editor.getCode().split('\n'),
                  blank = null,
                  i = 0;

              for (; i < code.length; i++) {
                if (blank === null && code[i].trim() === '') {
                  blank = i;
                  break;
                }
              }

              editor.setCursor({ line: (store.sessionStorage.getItem('line') || blank || 0) * 1, ch: (store.sessionStorage.getItem('character') || 0) * 1 });
            }
          }, 110); // This is totally arbitrary
        }
      }, 0);
    },
    populateEditor: function () {
      populateEditor(this, this.name);
    },

    // events
    on: function (event, fn) {
      (this._eventHandlers[event] = this._eventHandlers[event] || []).push(fn);
      return this;
    },

    trigger: function (event) {
      var args = [].slice.call(arguments, 1);
      args.unshift({ type: event });
      for (var list = this._eventHandlers[event], i = 0; list && list[i];) {
        list[i++].apply(this, args);
      }
      return this;
    }
  };

  function populateEditor(editor, panel) {
    if (!editor.codeSet) {
      // populate - should eventually use: session, saved data, local storage
      var cached = store.sessionStorage.getItem('jsbin.content.' + panel), // session code
          saved = jsbin.embed ? null : store.localStorage.getItem('saved-' + panel), // user template
          sessionURL = store.sessionStorage.getItem('url'),
          changed = false;

      // if we clone the bin, there will be a checksum on the state object
      // which means we happily have write access to the bin
      if (sessionURL !== jsbin.getURL() && !jsbin.state.checksum) {
        // nuke the live saving checksum
        store.sessionStorage.removeItem('checksum');
        jsbin.saveChecksum = false;
      }

      if (template && cached == template[panel]) { // restored from original saved
        editor.setCode(cached);
      } else if (cached && sessionURL == jsbin.getURL() && sessionURL !== jsbin.root) { // try to restore the session first - only if it matches this url
        editor.setCode(cached);
        // tell the document that it's currently being edited, but check that it doesn't match the saved template
        // because sessionStorage gets set on a reload
        changed = cached != saved && cached != template[panel];
      } else if (!template.post && saved !== null && !/(edit|embed)$/.test(window.location) && !window.location.search) { // then their saved preference
        editor.setCode(saved);
        var processor = JSON.parse(store.localStorage.getItem('saved-processors') || '{}')[panel];
        if (processor) {
          jsbin.processors.set(coder.editors.panels.panels[panel], processor);
        }
      } else { // otherwise fall back on the JS Bin default
        editor.setCode(template[panel]);
      }

      if (editor.editor && editor.editor.clearHistory) {
        editor.editor.clearHistory();
      }

    } else {
      // this means it was set via the url
      changed = true;
    }

    if (changed) {
      $document.trigger('codeChange', [ { revert: false, onload: true } ]);
    }
  }


  // moved from processors/processor.js

  processors.set = function (panel, processorName, callback) {
    var panelId = panel.id;;

    if (!jsbin.state.processors) {
      jsbin.state.processors = {};
    }

    var cmMode = processorName ? editorModes[processorName] || editorModes[panelId] : editorModes[panelId];

    // For JSX, use the plain JavaScript mode but disable smart indentation
    // because it doesn't work properly
    var smartIndent = processorName !== 'jsx';

    if (!panel) { return; }

    panel.trigger('processor', processorName || 'none');
    if (processorName && processors[processorName]) {
      jsbin.state.processors[panelId] = processorName;
      panel.processor = processors[processorName](function () {
        // processor is ready
        panel.editor.setOption('mode', cmMode);
        panel.editor.setOption('smartIndent', smartIndent);
        $('div.processorSelector')/*$processorSelectors*/.find('a').trigger('select', [processorName]);
        if (callback) { callback(); }
      });
    } else {
      // remove the preprocessor
      panel.editor.setOption('mode', cmMode);
      panel.editor.setOption('smartIndent', smartIndent);

      panel.processor = defaultProcessor;
      // delete jsbin.state.processors[panelId];
      jsbin.state.processors[panelId] = panelId;
      delete panel.type;
    }

    // linting
    var mmMode = cmMode;
    if (cmMode === 'javascript') {
      mmMode = 'js';
    }
    if (cmMode === 'htmlmixed') {
      mmMode = 'html';
    }
    var isHint = panel.editor.getOption('lint');
    if (isHint) {
      panel.editor.lintStop();
    }
    if (jsbin.settings[mmMode + 'hint']) {
      panel.editor.setOption('mode', cmMode);
      if (typeof hintingDone !== 'undefined') {
        panel.editor.setOption('mode', cmMode);
        hintingDone(panel.editor);
      }
    }
  };

  return coder.editors.Panel = Panel;
});
define('skylark-jsbin-coder/editors/panels',[
  "skylark-jquery",
  "skylark-jsbin-base/storage",
  "skylark-jsbin-processors",
  "skylark-jsbin-renderer",  
  "../jsbin",
   "./panel"
],function ($,store,processors,renderer,jsbin,Panel) {
    'use strict';

  var panels = {};

  panels.getVisible = function () {
    var panels = this.named,  // this.panels => this.named
        visible = [];
    for (var panel in panels) {
      if (panels[panel].visible) visible.push(panels[panel]);
    }
    return visible;
  };

  panels.save = function () {
    // don't save panel state if we're in embed mode
    if (jsbin.embed) {
      return;
    }

    var visible = this.getVisible(),
        state = {},
        panel,
        left = '',
        width = jsbin.$window.width();

    for (var i = 0; i < visible.length; i++) {
      panel = visible[i];
      left = panel.$el.css('left');
      if (left.indexOf('%') === -1) {
        // convert the pixel to relative - this is because jQuery pulls
        // % for Webkit based, but px for Firefox & Opera. Cover our bases
        left = (parseFloat(left)  / width * 100) + '%';
      }
      state[panel.name] = left;
    }

    store.sessionStorage.setItem('jsbin.panels', JSON.stringify(state));
  };

  function getQuery(qs) {
    /*globals $*/
    var sep = '&';
    var eq = '=';
    var obj = {};

    var regexp = /\+/g;
    qs = qs.split(sep);

    var maxKeys = 1000;

    var len = qs.length;
    // maxKeys <= 0 means that we should not limit keys count
    if (maxKeys > 0 && len > maxKeys) {
      len = maxKeys;
    }

    for (var i = 0; i < len; ++i) {
      var x = qs[i].replace(regexp, '%20'),
          idx = x.indexOf(eq),
          kstr, vstr, k, v;

      if (idx >= 0) {
        kstr = x.substr(0, idx);
        vstr = x.substr(idx + 1);
      } else {
        kstr = x;
        vstr = '';
      }

      try {
        k = decodeURIComponent(kstr);
        v = decodeURIComponent(vstr);
      } catch (e) {
        k = kstr;
        v = vstr;
      }

      if (!(window.hasOwnProperty ? window.hasOwnProperty(obj, k) : obj.hasOwnProperty(k))) {
        obj[k] = v;
      } else if ($.isArray(obj[k])) {
        obj[k].push(v);
      } else {
        obj[k] = [obj[k], v];
      }
    }

    return obj;
  }

  function stringAsPanelsToOpen(query) {
    var validPanels = ['live', 'javascript', 'html', 'css', 'console'];

    return query.split(',').reduce(function (toopen, key) {
      if (key === 'js') {
        key = 'javascript';
      }

      if (key === 'output') {
        key = 'live';
      }

      if (validPanels.indexOf(key) !== -1) {
        toopen.push(key);
      }

      return toopen;
    }, []);
  }

  panels.restore = function () {
    'use strict';
    /*globals jsbin, editors, $window, $document*/
    // if there are panel names on the hash (v2 of jsbin) or in the query (v3)
    // then restore those specific panels and evenly distribute them.
    var open = [],
        defaultPanels = ['html', 'live'], // sigh, live == output :(
        location = window.location,
        search = location.search.substring(1),
        hash = location.hash.substring(1),
        toopen = [],
        state = jsbin.embed ? null : JSON.parse(store.sessionStorage.getItem('jsbin.panels') || 'null'),
        hasContent = { javascript: panels.named.javascript.getCode().length,
          css: panels.named.css.getCode().length,
          html: panels.named.html.getCode().length
        },
        name = '',
        i = 0,
        panel = null,
        init = [],
        panelURLValue = '',
        openWithSameDimensions = false,
        width = jsbin.$window.width(),
        deferredCodeInsert = '',
        focused = !!store.sessionStorage.getItem('panel'),
        validPanels = 'live javascript html css console'.split(' '),
        cachedHash = '';

    if (history.replaceState && (location.pathname.indexOf('/edit') !== -1) || ((location.origin + location.pathname) === jsbin.getURL() + '/')) {
      // history.replaceState(null, '', jsbin.getURL() + (jsbin.getURL() === jsbin.root ? '' : '/edit') + (hash ? '#' + hash : ''));
    }

    if (search || hash) {
      var query = (search || hash);

      // assume the query is: html=xyz
      if (query.indexOf('&') !== -1) {
        query = getQuery(search || hash);
        toopen = Object.keys(query).reduce(function (toopen, key) {
          if (key.indexOf(',') !== -1 && query[key] === '') {
            toopen = stringAsPanelsToOpen(key);
            return toopen;
          }

          if (key === 'js') {
            query.javascript = query.js;
            key = 'javascript';
          }

          if (key === 'output') {
            query.live = query.live;
            key = 'live';
          }

          if (query[key] === undefined) {
            query[key] = '';
          }

          if (validPanels.indexOf(key) !== -1) {
            toopen.push(key + '=' + query[key]);
          }

          return toopen;
        }, []);
      } else {
        toopen = stringAsPanelsToOpen(query);
      }
    }

    if (toopen.length === 0) {
      if (state !== null) {
        toopen = Object.keys(state);
      }
      else {
        // load from personal settings
        toopen = jsbin.mobile ? [jsbin.settings.panels[0]] : jsbin.settings.panels;
      }
    }

    if (toopen.length === 0) {
      if (hasContent.javascript) {toopen.push('javascript');}
      if (hasContent.html) {toopen.push('html');}
      if (hasContent.css) {toopen.push('css');}
      toopen.push('live');
    }

    panels.saveOnExit = true;

    /* Boot code */
    // then allow them to view specific panels based on comma separated hash fragment/query
    i = 0;

    if (toopen.length === 0) {
      toopen = defaultPanels;
    }

    if (toopen.length) {
      for (name in state) {
        if (toopen.indexOf(name) !== -1) {
          i++;
        }
      }

      if (i === toopen.length) {
        openWithSameDimensions = true;
      }

      for (i = 0; i < toopen.length; i++) {
        panelURLValue = null;
        name = toopen[i];

        // if name contains an `=` it means we also need to set that particular panel to that code
        if (name.indexOf('=') !== -1) {
          panelURLValue = name.substring(name.indexOf('=') + 1);
          name = name.substring(0, name.indexOf('='));
        }

        if (panels.named[name]) { // panels.panels => panels.named
          panel = panels.named[name]; // panels.panels => panels.named
          // console.log(name, 'width', state[name], width * parseFloat(state[name]) / 100);
          if (panel.editor && panelURLValue !== null) {
            panel.setCode(decodeURIComponent(panelURLValue));
          }

          if (openWithSameDimensions && toopen.length > 1) {
            panel.show(width * parseFloat(state[name]) / 100);
          } else {
            panel.show();
          }
          init.push(panel);
        } else if (name && panelURLValue !== null) { // TODO support any varible insertion
          (function (name, panelURLValue) {
            var todo = ['html', 'javascript', 'css'];

            var deferredInsert = function (event, data) {
              var code, parts, panel = panels.named[data.panelId] || {}; // panels.panels => panels.named

              if (data.panelId && panel.editor && panel.ready === true) {
                todo.splice(todo.indexOf(data.panelId), 1);
                try {
                  code = panel.getCode();
                } catch (e) {
                  // this really shouldn't happen
                  // console.error(e);
                }
                if (code.indexOf('%' + name + '%') !== -1) {
                  parts = code.split('%' + name + '%');
                  code = parts[0] + decodeURIComponent(panelURLValue) + parts[1];
                  panel.setCode(code);
                  jsbin.$document.unbind('codeChange', deferredInsert);
                }
              }

              if (todo.length === 0) {
                jsbin.$document.unbind('codeChange', deferredInsert);
              }
            };

            jsbin.$document.bind('codeChange', deferredInsert);
          }(name, panelURLValue));
        }
      }

      // support the old jsbin v1 links directly to the preview
      if (toopen.length === 1 && toopen[0] === 'preview') {
        panels.named.live.show(); // panels.panels => panels.named
      }

      if (!openWithSameDimensions) {this.distribute();}
    }

    // now restore any data from sessionStorage
    // TODO add default templates somewhere
    // var template = {};
    // for (name in this.panels) {
    //   panel = this.panels[name];
    //   if (panel.editor) {
    //     // panel.setCode(store.sessionStorage.getItem('jsbin.content.' + name) || template[name]);
    //   }
    // }

    for (i = 0; i < init.length; i++) {
      init[i].init();
    }

    var visible = panels.getVisible();
    if (visible.length) {
      jsbin.$body.addClass('panelsVisible');
      if (!focused) {
        visible[0].show();
      }
    }

  };

  panels.savecontent = function () {
    // loop through each panel saving it's content to sessionStorage
    var name, panel;
    for (name in this.named) {  // this.panels => this.named
      panel = this.named[name]; // this.panels => this.named
      if (panel.editor) store.sessionStorage.setItem('jsbin.content.' + name, panel.getCode());
    }
  };

  panels.getHighlightLines = function () {
    'use strict';
    var hash = [];
    var lines = '';
    var panel;
    for (name in panels.named) { // panels.panels => panels.named
      panel = panels.named[name]; // panels.panels => panels.named
      if (panel.editor) {
        lines = panel.editor.highlightLines().string;
        if (lines) {
          hash.push(name.substr(0, 1).toUpperCase() + ':L' + lines);
        }
      }
    }
    return hash.join(',');
  };

  panels.focus = function (panel) {
    this.focused = panel;
    if (panel) {
      $('.panel').removeClass('focus').filter('.' + panel.id).addClass('focus');
    }
  }

  panels.getQuery = function () {
    var alt = {
      javascript: 'js',
      live: 'output'
    };

    var visible = panels.getVisible();

    return visible.map(function (p) {
      return alt[p.id] || p.id;
    }).join(',');
  }

  panels.updateQuery = jsbin.throttle(function updateQuery() {
    var query = panels.getQuery();

    if (jsbin.state.code && jsbin.state.owner) {
      $.ajax({
        url: jsbin.getURL({ withRevision: true }) + '/settings',
        type: 'PUT',
        data: { panels: visible.map(function (p) { return p.id; }) },
        success: function () {}
      });
    }

    if (history.replaceState) {
      history.replaceState(null, null, '?' + query);
    }
  }, 100);

  var userResizeable = !$('html').hasClass('layout');

  if (!userResizeable) {
    $('#source').removeClass('stretch');
  }

  // evenly distribute the width of all the visible panels
  panels.distribute = function () {
    if (!userResizeable) {
      return;
    }

    var visible = $('#source .panelwrapper:visible'),
        width = 100,
        height = 0,
        innerW = jsbin.$window.width() - (visible.length - 1), // to compensate for border-left
        innerH = $('#source').outerHeight(),
        left = 0,
        right = 0,
        top = 0,
        panel,
        nestedPanels = [];

    if (visible.length) {
      jsbin.$body.addClass('panelsVisible');

      // visible = visible.sort(function (a, b) {
      //   return a.order < b.order ? -1 : 1;
      // });

      width = 100 / visible.length;
      for (var i = 0; i < visible.length; i++) {
        panel = $.data(visible[i], 'panel');
        right = 100 - (width * (i+1));
        panel.$el.css({ top: 0, bottom: 0, left: left + '%', right: right + '%' });
        panel.splitter.trigger('init', innerW * left/100);
        panel.splitter[i == 0 ? 'hide' : 'show']();
        left += width;

        nestedPanels = $(visible[i]).find('.panel');
        if (nestedPanels.length > 1) {
          top = 0;
          nestedPanels = nestedPanels.filter(':visible');
          height = 100 / nestedPanels.length;
          nestedPanels.each(function (i) {
            bottom = 100 - (height * (i+1));
            var panel = panels.named[$.data(this, 'name')];  // jsbin.panels.panels => panels.named
            // $(this).css({ top: top + '%', bottom: bottom + '%' });
            $(this).css('top', top + '%');
            $(this).css('bottom', bottom + '%' );
            if (panel.splitter.hasClass('vertical')) {
              panel.splitter.trigger('init', innerH * top/100);
              panel.splitter[i == 0 ? 'hide' : 'show']();
            }
            top += height;
          });
        }
      }
    } else if (!jsbin.embed) {
      $('#history').show();
      setTimeout(function () {
        jsbin.$body.removeClass('panelsVisible');
      }, 100); // 100 is on purpose to add to the effect of the reveal
    }
  };

  panels.show = function (panelId) {
    this.named[panelId].show();  // this.panels => this.named
    if (this.named[panelId].editor) { // this.panels => this.named
      this.named[panelId].editor.focus(); // this.panels => this.named
    }
    this.named[panelId].focus(); // this.panels => this.named
  };

  panels.hide = function (panelId) {
    var $history = $('#history'); // TODO shouldn't have to keep hitting this
    var panels = this.named; // this.panels => this.named
    if (panels[panelId].visible) {
      panels[panelId].hide();
    }

    var visible = panels.getVisible();
    if (visible.length) {
      panels.focused = visible[0];
      if (panels.focused.editor) {
        panels.focused.editor.focus();
      } else {
        panels.focused.$el.focus();
      }
      panels.focused.focus();
    }

    /*
    } else if ($history.length && !$body.hasClass('panelsVisible')) {
      $body.toggleClass('dave', $history.is(':visible'));
      $history.toggle(100);
    } else if ($history.length === 0) {
      // TODO load up the history
    }
    */
  };

  panels.hideAll = function (fromShow) {
    var visible = panels.getVisible(),
        i = visible.length;
    while (i--) {
      visible[i].hide(fromShow);
    }
  };

  // dirty, but simple
  Panel.prototype.distribute = function () {
    panels.distribute();
  };

  var ignoreDuringLive = /^\s*(while|do|for)[\s*|$]/;


  var panelInit = {
    html: function () {
      var init = function () {
        // set cursor position on first blank line
        // 1. read all the inital lines
        var lines = this.editor.getValue().split('\n'),
            blank = -1;
        lines.forEach(function (line, i) {
          if (blank === -1 && line.trim().length === 0) {
            blank = i;
            //exit
          }
        });

        if (blank !== -1) {
          this.editor.setCursor({ line: blank, ch: 2 });
          if (lines[blank].length === 0) {
            this.editor.indentLine(blank, 'add');
          }
        }
      };

      return new Panel('html', { editor: true, label: 'HTML', init: init });
    },
    css: function () {
      return new Panel('css', { editor: true, label: 'CSS' });
    },
    javascript: function () {
      return new Panel('javascript', { editor: true, label: 'JavaScript' });
    },
    console: function () {
      // hide and show callbacks registered in console.js
      return new Panel('console', { label: 'Console' });
    },
    live: function () {
      function show() {
        // var panel = this;
        if (panels.ready) {
          renderLivePreview();
        }
      }

      function hide() {
        // detroy the iframe if we hide the panel
        // note: $live is defined in live.js
        // Commented out so that the live iframe is never destroyed
        if (panels.named.console.visible === false) { // panels.panels => panels.named
          // $live.find('iframe').remove();
        }
      }

      return new Panel('live', { label: 'Output', show: show, hide: hide });
    }
  };

  var editors = panels.named = {};  // panels.panels => panels.named

  // show all panels (change the order to control the panel order)
  panels.named.html = panelInit.html();
  panels.named.css = panelInit.css();
  panels.named.javascript = panelInit.javascript();
  panels.named.console = panelInit.console();
  ///upgradeConsolePanel(editors.console);
  panels.named.live = panelInit.live();

  panels.named.live.settings.render = function (showAlerts) {
    if (panels.ready) {
      renderLivePreview(showAlerts);
    }
  };

  panels.allEditors = function (fn) {
    var panelId, panel;
    for (panelId in panels.named) {  // panels.panels => panels.named
      panel = panels.named[panelId]; // panels.panels => panels.named
      if (panel.editor) fn(panel);
    }
  };

  setTimeout(function () {
    panels.restore();
  }, 10);
  panels.focus(panels.getVisible()[0] || null);

  var editorsReady = setInterval(function () {
    var ready = true,
        resizeTimer = null,
        panel,
        panelId,
        hash = window.location.hash.substring(1);


    for (panelId in panels.named) {  // panels.panels => panels.named
      panel = panels.named[panelId]; // panels.panels => panels.named
      if (panel.visible && !panel.ready) {
        ready = false;
        break;
      }
    }

    panels.ready = ready;

    if (ready) {
      panels.allEditors(function (panel) {
        var key = panel.id.substr(0, 1).toUpperCase() + ':L';
        if (hash.indexOf(key) !== -1) {
          var lines = hash.match(new RegExp(key + '(\\d+(?:-\\d+)?)'));
          if (lines !== null) {
            panel.editor.highlightLines(lines[1]);
          }
        }
      });

      var altLibraries = $('li.add-library');
      var altRun = $('li.run-with-js');
      panels.named.live.on('hide', function () {
        altLibraries.show();
        altRun.hide();
      });

      panels.named.live.on('show', function () {
        altLibraries.hide();
        altRun.show();
      });

      if (panels.named.live.visible) { // panels.panels => panels.named
        panels.named.live.trigger('show');
      } else {
        panels.named.live.trigger('hide');
      }

      clearInterval(editorsReady);

      // if the console is visible, it'll handle rendering of the output and console
      if (panels.named.console.visible) { // panels.panels => panels.named
        panels.named.console.render();
      } else {
        // otherwise, force a render
        renderLivePreview();
      }


      if (!jsbin.mobile) {
        $(window).resize(function () {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () {
            jsbin.$document.trigger('sizeeditors');
          }, 100);
        });
      }

      jsbin.$document.trigger('sizeeditors');
      jsbin.$document.trigger('jsbinReady');
    }
  }, 100);



  setTimeout(function () {
    panels.restore();
  }, 10);
  panels.focus(panels.getVisible()[0] || null);

  // moved from processors/processor.js
  var render = function() {
    if (panels.ready) {
      panels.named.console.render();
    }
  };

  var $panelButtons = $('#panels');

  var $processorSelectors = $('div.processorSelector').each(function () {
    var panelId = this.getAttribute('data-type'),
        $el = $(this),
        $label = $el.closest('.label').find('strong a'),
        originalLabel = $label.text();

    $el.find('a').click(function (e) {
      var panel = panels.named[panelId];
      var $panelButton = $panelButtons.find('a[href$="' + panelId + '"]');

      e.preventDefault();
      var target = this.hash.substring(1),
          label = $(this).text(),
          labelData = $(this).data('label');
      if (target !== 'convert') {
        $panelButton.html(labelData || label);
        $label.html('<span>' + label + '</span>');
        if (target === panelId) {
          processors.reset(panelId);
          render();
        } else {
          processors.set(panelId, target, render);
        }
      } else {
        $label.text(originalLabel);
        $panelButton.html(originalLabel);
        panel.render().then(function (source) {
          processors.reset(panelId);
          panel.setCode(source);
        });
      }
    }).bind('select', function (event, value) {
      if (value === this.hash.substring(1)) {
        var $panelButton = $panelButtons.find('a[href$="' + panelId + '"]');
        var $this = $(this);
        $label.html('<span>' + $this.text() + '</span>');
        $panelButton.html($this.data('label') || $this.text());
      }
    });
  });

  var _set = processors.set;
  processors.set = function (panelId, processorName, callback) {
    var panel;

    // panelId can be id or instance of a panel.
    // this is kinda nasty, but it allows me to set panel processors during boot
    if (panelId instanceof Panel) {
      panel = panelId;
    } else {
      panel = panels.named[panelId];
    }

    _set(panel,processorName,callback);

  };


  processors.reset = function (panelId) {
    processors.set(panelId);
  };



  // moved from render/render.js
  var renderCodeWorking = false;
  function formatErrors(res) {
    var errors = [];
    var line = 0;
    var ch = 0;
    for (var i = 0; i < res.length; i++) {
      line = res[i].line || 0;
      ch = res[i].ch || 0;
      errors.push({
        from: {line, ch},
        to: {line, ch},
        message: res[i].msg,
        severity: 'error',
      });
    }
    return errors;
  };

  var getRenderedCode = panels.getRenderedCode =  function () {
    'use strict';

    if (renderCodeWorking) {
      // cancel existing jobs, and replace with this job
    }

    renderCodeWorking = true;

    // this allows us to make use of a promise's result instead of recompiling
    // the language each time
    var promises = ['html', 'javascript', 'css'].reduce(function (prev, curr) {
      if (!jsbin.owner() || panels.focused && curr === panels.focused.id) {
        getRenderedCode[curr] = getRenderedCode.render(curr);
      }
      prev.push(getRenderedCode[curr]);
      return prev;
    }, []);

    return Promise.all(promises).then(function (data) {
      var res = {
        html: data[0],
        javascript: data[1],
        css: data[2],
      };
      return res;
    }).catch(function (e) {
      // swallow
    });
  };

  getRenderedCode.render = function render (language) {
    return new Promise(function (resolve, reject) {
      panels.named[language].render().then(resolve, function (error) {
        console.warn(panels.named[language].processor.id + ' processor compilation failed');
        if (!error) {
          error = {};
        }

        if ($.isArray(error)) { // then this is for our hinter
          // console.log(data.errors);
          var cm = panels.named[language].editor;

          // if we have the error reporting function (called updateLinting)
          if (typeof cm.updateLinting !== 'undefined') {
            hintingDone(cm);
            var err = formatErrors(error);
            cm.updateLinting(err);
          } else {
            // otherwise dump to the console
            console.warn(error);
          }
        } else if (error.message) {
          console.warn(error.message, error.stack);
        } else {
          console.warn(error);
        }

        reject(error);
      });
    });
  };


 function sendReload() {
    if (jsbin.saveChecksum) {
      $.ajax({
        url: jsbin.getURL() + '/reload',
        data: {
          code: jsbin.state.code,
          revision: jsbin.state.revision,
          checksum: jsbin.saveChecksum
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
  var renderLivePreview = panels.renderLivePreview = function (requested) {
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
      var visiblePanels = panels.getVisible();
      var outputPanelOpen = visiblePanels.indexOf(panels.named.live) > -1;
      var consolePanelOpen = visiblePanels.indexOf(panels.named.console) > -1;
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
          injectCSS: jsbin.state.hasBody && panels.focused.id === 'css',
          requested: requested,
          debug: jsbin.settings.debug,
          includeJsInRealtime: jsbin.settings.includejs,
        },
      });

      jsbin.state.hasBody = true;

    });
  };
  return jsbin.coder.editors.panels = panels;
});
define('skylark-jsbin-coder/editors/mobile-keyboard',[
  "skylark-jquery",
   "../jsbin",
   "./mobile-command-maps",
   "./panels"
],function ($,jsbin,commandMaps,panels) {
  /* globals jsbin, $, escapeHTML, $document, editors, commandMaps */

  if (!jsbin.mobile || jsbin.embed) {
    return;
  }

  var getCursor = function (field) {
    if (field.selectionStart) {
      return field.selectionStart;
    }
    if (field.createTextRange) {
      var range = field.createTextRange();
      return range.startOffset;
    }
  };

  var getTA = function () {
    return panels.focused.editor.textarea;
  };

  var mobileUtils = {
    next: function () {

    },
    close: function (needle) {
      var ta = getTA();
      var pos = getCursor(ta);
      // look backwards
      var tagposition = ta.value.substring(0, pos).lastIndexOf(needle);
      if (needle === '>') {
        var start = 0;
        while (start > -1) {
          start = ta.value.substring(0, tagposition).lastIndexOf('<') + 1;
          var c = ta.value.substr(start, 1);
          if (c === '/') {
            // we've got another closing tag, move back
            var matched = ta.value.substr(start + 1, ta.value.substr(start).indexOf('>') - 1);
            tagposition = ta.value.lastIndexOf('<' + matched);
            continue;
          }

          if (c === '!') {
            return '';
          }

          if (start === 0) {
            return '';
          }
          break;
        }

        var tail = ta.value.substr(start, tagposition).indexOf(needle);
        return '</' + ta.value.substr(start, tail) + '>$0';
      }
    },
    complete: function () {
      var focused = panels.focused;
      if (focused.id === 'html' || focused.id === 'css') {
        CodeMirror.commands['emmet.expand_abbreviation_with_tab'].call(null, focused.editor);
      } else if (focused.editor._hasCompletions && focused.editor._hasCompletions()) {
        focused.editor._showCompletion();
      } else {
        CodeMirror.commands.autocomplete(focused.editor);
      }
      focused.editor.focus();
    },
  };

  var buttons = {
    html: $(),
    css: $(),
    js: $(),
    console: $(),
    all: $(),
  };

  var makeCommand = function (command) {
    var button = $('<button>');
    var toinsert = command.value;
    var label = command.value.replace(/\$0/, '');
    if (!command.callback) {
      command.callback = function () {
        return toinsert;
      };
    }

    button.on('click', function () {
      var focused = panels.focused;
      if (focused.editor) {
        var pos = focused.editor.getCursor();
        var value = command.callback.call(mobileUtils);
        if (value == null) {
          return;
        }
        var resetTo = value.indexOf('$0');
        if (resetTo === -1) {
          resetTo = 0;
        }
        var offset = focused.editor.cursorPosition().character + resetTo;
        if (pos !== -1) {
          value = value.replace('$0', '');
        }
        focused.editor.replaceRange(value, pos, pos);
        focused.editor.setCursor(offset);

        focused.editor.textarea.focus();
      } else if (focused.id === 'console') {
        focused.setCursorTo(command.callback().replace('\$0', ''), true);
        focused.$el.click();
      }
    });

    button.html(escapeHTML(label));
    strip.find('div').append(button);

    if (command.panel) {
      if (typeof command.panel === 'string') {
        buttons[command.panel] = buttons[command.panel].add(button);
      } else {
        command.panel.forEach(function (p) {
          buttons[p] = buttons[p].add(button);
        });
      }
      buttons.all = buttons.all.add(button);
    }
  };

  var strip = $('<div id="strip"><div class="inner-strip"></div></div>');

  commandMaps.map(makeCommand);

  $('body').append(strip);

  var hideAll = function (panel) {
    return function () {
      buttons.all.hide();
      if (buttons[panel]) {
        buttons[panel].show();
      }
    };
  };

  $document.on('jsbinReady', function () {
    // hook up which buttons should be shown and when
    panels.named.html.on('show', hideAll('html')); // editors => panels.named
    panels.named.css.on('show', hideAll('css'));// editors => panels.named
    panels.named.javascript.on('show', hideAll('js'));// editors => panels.named
    panels.named.console.on('show', hideAll('console'));// editors => panels.named
    hideAll(panels.focused.id === 'javascript' ? 'js' : panels.focused.id)();  // panels =>panels
  });
});
define('skylark-jsbin-coder/editors/autocomplete',[
  "skylark-jquery",
   "../jsbin",
   "../coder"
],function ($,jsbin,coder) {

  // Minimal event-handling wrapper.
  function stopEvent() {
    if (this.preventDefault) {this.preventDefault(); this.stopPropagation();}
    else {this.returnValue = false; this.cancelBubble = true;}
  }
  function addStop(event) {
    if (!event.stop) event.stop = stopEvent;
    return event;
  }
  function connect(node, type, handler) {
    function wrapHandler(event) {handler(addStop(event || window.event));}
    if (typeof node.addEventListener == "function")
      node.addEventListener(type, wrapHandler, false);
    else
      node.attachEvent("on" + type, wrapHandler);
  }

  function forEach(arr, f) {
    for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
  }

  function startTagComplete(editor) {
    // We want a single cursor position.
    if (editor.somethingSelected()) return;
    // Find the token at the cursor
    var cur = editor.getCursor(false), token = editor.getTokenAt(cur), tprop = token;
    // If it's not a 'word-style' token, ignore the token.
    if (!/^[\w$_]*$/.test(token.string)) {
      token = tprop = {start: cur.ch, end: cur.ch, string: "", state: token.state,
                       className: token.string == "." ? "js-property" : null};
    }
    
    // If it is a property, find out what it is a property of.
    while (tprop.className == "js-property") {
      tprop = editor.getTokenAt({line: cur.line, ch: tprop.start});
      if (tprop.string != ".") return;
      tprop = editor.getTokenAt({line: cur.line, ch: tprop.start});
      if (!context) var context = [];
      context.push(tprop);
    }
    
    function insert(str) {
      editor.replaceRange(str, {line: cur.line, ch: token.start}, {line: cur.line, ch: token.end});
    }
    
    insert('<></>');
    editor.focus();
    editor.setCursor({ line: cur.line, ch: token.end });
    return true;
  }

  function startComplete(editor) {
    // We want a single cursor position.
    if (editor.somethingSelected()) return;
    // Find the token at the cursor
    var cur = editor.getCursor(false), token = editor.getTokenAt(cur), tprop = token;
    // If it's not a 'word-style' token, ignore the token.

    if (token.string == '') return;

    if (!/^[\w$_]*$/.test(token.string)) {
      token = tprop = {start: cur.ch, end: cur.ch, string: "", state: token.state,
                       className: token.string == "." ? "js-property" : null};
    }
    
    // If it is a property, find out what it is a property of.
    while (tprop.className == "js-property") {
      tprop = editor.getTokenAt({line: cur.line, ch: tprop.start});
      if (tprop.string != ".") return;
      tprop = editor.getTokenAt({line: cur.line, ch: tprop.start});
      if (!context) var context = [];
      context.push(tprop);
    }
    
    if (token.string == '' && context === undefined) return;
    
    var completions = getCompletions(token, context, editor);
    if (!completions.length) return;
    function insert(str) {
      editor.replaceRange(str, {line: cur.line, ch: token.start}, {line: cur.line, ch: token.end});
    }
    // When there is only one completion, use it directly.
    if (completions.length == 1) {insert(completions[0]); return true;}

    // Build the select widget
    var complete = document.createElement("div");
    complete.className = "completions";
    var sel = complete.appendChild(document.createElement("select"));
    sel.multiple = true;
    for (var i = 0; i < completions.length; ++i) {
      var opt = sel.appendChild(document.createElement("option"));
      opt.appendChild(document.createTextNode(completions[i]));
    }
    sel.firstChild.selected = true;
    sel.size = Math.min(10, completions.length);
    var pos = editor.cursorCoords();
    complete.style.left = pos.x + "px";
    complete.style.top = pos.yBot + "px";
    complete.style.position = 'absolute';
    complete.style.outline = 'none';
    complete.className = 'autocomplete';
    document.body.appendChild(complete);
    
    // Hack to hide the scrollbar.
    if (completions.length <= 10) {
      complete.style.width = (sel.clientWidth - 1) + "px";
    }

    var done = false;
    function close() {
      if (done) return;
      done = true;
      complete.parentNode.removeChild(complete);
    }
    function pick() {
      insert(sel.options[sel.selectedIndex].value);
      close();
      setTimeout(function(){editor.focus();}, 50);
    }
    
    function pickandclose() {
      pick()
      setTimeout(function () { editor.focus(); }, 50);
    }
    
    connect(sel, "blur", close);
    connect(sel, "keydown", function(event) {
      var code = event.keyCode;
      // Enter and space
      if (code == 13 || code == 32) { event.stop(); pick();}
      // Escape
      else if (code == 27) {event.stop(); close(); editor.focus();}
      else if (code != 38 && code != 40) {close(); editor.focus(); setTimeout(function () { startComplete(editor) }, 50);}
    });
    connect(sel, "dblclick", pick);

    sel.focus();
    // Opera sometimes ignores focusing a freshly created node
    if (window.opera) setTimeout(function(){if (!done) sel.focus();}, 100);
    return true;
  }

  var stringProps = ("charAt charCodeAt indexOf lastIndexOf substring substr slice trim trimLeft trimRight " +
                     "toUpperCase toLowerCase split concat match replace search").split(" ");
  var arrayProps = ("length concat join splice push pop shift unshift slice reverse sort indexOf " +
                    "lastIndexOf every some filter forEach map reduce reduceRight ").split(" ");
  var funcProps = "prototype apply call bind".split(" ");
  var keywords = ("break case catch continue debugger default delete do else false finally for function " +
                  "if in instanceof new null return switch throw true try typeof var void while with").split(" ");

  function getCompletions(token, context, editor) {
    var found = [], start = token.string;
    function maybeAdd(str) {
      if (str && str != start && str.indexOf(start) == 0 && found.indexOf(str) === -1) found.push(str);
    }
    function gatherCompletions(obj) {
      if (typeof obj == "string") forEach(stringProps, maybeAdd);
      else if (obj instanceof Array) forEach(arrayProps, maybeAdd);
      else if (obj instanceof Function) forEach(funcProps, maybeAdd);
      for (var name in obj) maybeAdd(name);
    }

    if (context) {
      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(), base;
      if (obj.className == "js-variable")
        base = window[obj.string];
      else if (obj.className == "js-string")
        base = "";
      else if (obj.className == "js-atom")
        base = 1;
      while (base != null && context.length)
        base = base[context.pop().string];
      if (base != null) gatherCompletions(base);
    }
    else {
      // If not, just look in the window object and any local scope
      // (reading into JS mode internals to get at the local variables)
      for (var v = token.state.localVars; v; v = v.next) maybeAdd(v.name);
      gatherCompletions(window);
      forEach(keywords, maybeAdd);
    }
    
    // also look up symbols in the current document
    var code = editor.getValue().split(/\W/);
    forEach(code, maybeAdd);
    
    return found;
  }

  return coder.editors.autocomplete = {
    startTagComplete
  };
});
define('skylark-jsbin-coder/editors/keycontrol',[
  "skylark-jquery",
   "../jsbin",
   "../coder",
   "./autocomplete",
   "./panels"
],function ($,jsbin,coder,autocomplete,panels) {
  /*globals objectValue, $, jsbin, $body, $document, saveChecksum, jsconsole*/
  var keyboardHelpVisible = false;

  var customKeys = jsbin.objectValue('settings.keys', jsbin) || {};

  function enableAltUse() {
    if (!jsbin.settings.keys) {
      jsbin.settings.keys = {};
    }
    jsbin.settings.keys.useAlt = this.checked;
    settings.save();
  }

  $('input.enablealt').attr('checked', customKeys.useAlt ? true : false).change(enableAltUse);

  if (!customKeys.disabled) {
    jsbin.$body.keydown(keycontrol);
  } else {
    jsbin.$body.addClass('nokeyboardshortcuts');
  }

  var panelShortcuts = {};
  panelShortcuts.start = 48;
  //   49: 'javascript', // 1
  //   50: 'css', // 2
  //   51: 'html', // 3
  //   52: 'console', // 4
  //   53: 'live' // 5
  // };

  // work out the browser platform
  var ua = navigator.userAgent;
  if (ua.indexOf(' Mac ') !== -1) {
    $.browser.platform = 'mac';
  } else if (/windows|win32/.test(ua)) {
    $.browser.platform = 'win';
  } else if (/linux/.test(ua)) {
    $.browser.platform = 'linux';
  } else {
    $.browser.platform = '';
  }


  if (!customKeys.disabled) {
    jsbin.$document.keydown(function (event) {
      var includeAltKey = customKeys.useAlt ? event.altKey : !event.altKey,
          closekey = customKeys.closePanel ? customKeys.closePanel : 48;

      if (event.ctrlKey && $.browser.platform !== 'mac') { event.metaKey = true; }

      // if (event.metaKey && event.which === 89 && !event.shiftKey) {
      //   archive(!jsbin.state.metadata.archive);
      //   return event.preventDefault();
      // }

      if (event.metaKey && event.which === 79) { // open
        $('a.homebtn').trigger('click', 'keyboard');
        event.preventDefault();
      } else if (event.metaKey && event.shiftKey && event.which === 8) { // cmd+shift+backspace
        $('a.deletebin:first').trigger('click', 'keyboard');
        event.preventDefault();
      } else if (!jsbin.embed && event.metaKey && event.which === 83) { // save
        if (event.shiftKey === false) {
          if (jsbin.saveChecksum) {
            jsbin.saveChecksum = false;
            jsbin.$document.trigger('snapshot');
          } else {
            // trigger an initial save
            $('a.save:first').click();
          }
          event.preventDefault();
        } else if (event.shiftKey === true) { // shift+s = open share menu
          var $sharemenu = $('#sharemenu');
          if ($sharemenu.hasClass('open')) {

          }
          $('#sharemenu a').trigger('mousedown');
          event.preventDefault();
        }
      } else if (event.which === closekey && event.metaKey && includeAltKey && panels.focused) {
        panels.hide(panels.focused.id);
      } else if (event.which === 220 && (event.metaKey || event.ctrlKey)) {
        jsbin.settings.hideheader = !jsbin.settings.hideheader;
        jsbin.$body[jsbin.settings.hideheader ? 'addClass' : 'removeClass']('hideheader');
      } else if (event.which === 76 && event.ctrlKey && panels.panels.console.visible) {
        if (event.shiftKey) {
          // reset
          jsconsole.reset();
        } else {
          // clear
          jsconsole.clear();
        }
      }
    });
  }

  var ignoreNextKey = false;

  function keycontrol(event) {
    event = normalise(event);

    var panel = {};

    if (panels.focused && panels.focused.editor) {
      panel = panels.focused.editor;
    } else if (panels.focused) {
      panel = panels.focused;
    }

    var codePanel = { css: 1, javascript: 1, html: 1}[panel.id],
        hasRun = false;

    var includeAltKey = customKeys.useAlt ? event.altKey : !event.altKey;

    // if (event.which === 27 && !ignoreNextKey) {
    //   ignoreNextKey = true;
    //   return;
    // } else if (ignoreNextKey && panelShortcuts[event.which] !== undefined && event.metaKey && includeAltKey) {
    //   ignoreNextKey = false;
    //   return;
    // } else if (!event.metaKey) {
    //   ignoreNextKey = false;
    // }

    // these should fire when the key goes down
    if (event.type === 'keydown') {
      if (codePanel) {
        if (event.metaKey && event.which === 13) {
          if (panels.named.console.visible && !panels.named.live.visible) { // editors => panels.named
            hasRun = true;
            // panels.named.console.render(); // editors => panels.named
            $('#runconsole').trigger('click', 'keyboard');
          } else if (panels.named.live.visible) {
            // panels.named.live.render(true); // editors => panels.named
            $('#runwithalerts').trigger('click', 'keyboard');
            hasRun = true;
          } else {
            $('#runwithalerts').trigger('click', 'keyboard');
            hasRun = true;
          }

          if (hasRun) {
            event.stop();
          } else {
            // if we have write access - do a save - this will make this bin our latest for use with
            // /<user>/last/ - useful for phonegap inject
            sendReload();
          }
        }
      }

      // shortcut for showing a panel
      if (panelShortcuts[event.which] !== undefined && event.metaKey && includeAltKey) {
        if (panels.focused.id === panelShortcuts[event.which]) {
          // this has been disabled in favour of:
          // if the panel is visible, and the user tries cmd+n - then the browser
          // gets the key command.
          panels.hide(panelShortcuts[event.which]);
          event.stop();
        } else {
          // show
          panels.show(panelShortcuts[event.which]);
          event.stop();

          if (!customKeys.useAlt && (!jsbin.settings.keys || !jsbin.settings.keys.seenWarning)) {
            var cmd = $.browser.platform === 'mac' ? 'cmd' : 'ctrl';
            if (!jsbin.settings.keys) {
              jsbin.settings.keys = {};
            }
            jsbin.settings.keys.seenWarning = true;
            jsbin.$document.trigger('tip', {
              type: 'notification',
              content: '<label><input type="checkbox" class="enablealt"> <strong>Turn this off</strong>. Reserve ' + cmd + '+[n] for switching browser tabs and use ' + cmd + '+<u>alt</u>+[n] to switch JS Bin panels. You can access this any time in <strong>Help&rarr;Keyboard</strong></label>'
            });
            $('#tip').delegate('input.enablealt', 'click', function () {
              enableAltUse.call(this);
              window.location.reload();
            });
          }
        }
      }

      if (event.which === 191 && event.metaKey && event.shiftKey) {
        // show help
        opendropdown($('#help').prev()[0]);
        event.stop();
      } else if (event.which === 27 && keyboardHelpVisible) {
        jsbin.$body.removeClass('keyboardHelp');
        keyboardHelpVisible = false;
        event.stop();
      } else if (event.which === 27 && panels.focused && codePanel) {
        // event.stop();
        // return CodeMirror.commands.autocomplete(panels.focused.editor);
      } else if (event.which === 190 && includeAltKey && event.metaKey && panel.id === 'html') {
        // auto close the element
        if (panel.somethingSelected()) {return;}
        // Find the token at the cursor
        var cur = panel.getCursor(false), token = panel.getTokenAt(cur), tprop = token;
        // If it's not a 'word-style' token, ignore the token.
        if (!/^[\w$_]*$/.test(token.string)) {
          token = tprop = {start: cur.ch, end: cur.ch, string: '', state: token.state,
                           className: token.string === '.' ? 'js-property' : null};
        }

        panel.replaceRange('</' + token.state.htmlState.context.tagName + '>', {line: cur.line, ch: token.end}, {line: cur.line, ch: token.end});
        event.stop();
      } else if (event.which === 188 && event.ctrlKey && event.shiftKey && codePanel) {
        // start a new tag
        event.stop();
        return autocomplete.startTagComplete(panel);
      }
    }
    // return true;

    if (event.stopping) {
      return false;
    }
  }

  function normalise(event) {
    var myEvent = {
      type: event.type,
      which: event.which,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      orig: event
    };

    if ( event.which === null && (event.charCode !== null || event.keyCode !== null) ) {
      myEvent.which = event.charCode !== null ? event.charCode : event.keyCode;
    }

    // Add metaKey to non-Mac browsers (use ctrl for PC's and Meta for Macs)
    if ( !event.metaKey && event.ctrlKey ) {
      myEvent.metaKey = event.ctrlKey;
    }

    // this is retarded - I'm having to mess with the event just to get Firefox
    // to send through the right value. i.e. when you include a shift key modifier
    // in Firefox, if it's punctuation - event.which is zero :(
    // Note that I'm only doing this for the ? symbol + ctrl + shift
    if (event.which === 0 && event.ctrlKey === true && event.shiftKey === true && event.type === 'keydown') {
      myEvent.which = 191;
    }

    var oldStop = event.stop;
    myEvent.stop = function () {
      myEvent.stopping = true;
      if (oldStop) {oldStop.call(event);}
    };

    return myEvent;
  }

  return coder.editors.keycontrol = keycontrol;
});
define('skylark-jsbin-coder/editors/libraries',[
  "skylark-jquery",
  "skylark-jsbin-base/storage",
   "../jsbin",
   "../coder"
],function ($,store,jsbin,coder) {
  var libraries = [
    {
      'url': 'https://code.jquery.com/jquery-git.js',
      'label': 'jQuery WIP (via git)',
      'group': 'jQuery'
    },
    {
      'url': 'https://code.jquery.com/jquery-3.1.0.js',
      'label': 'jQuery 3.1.0',
      'group': 'jQuery'
    },
    {
      'url': 'https://code.jquery.com/jquery-3.0.0.js',
      'label': 'jQuery 3.0.0',
      'group': 'jQuery'
    },
    {
      'url': 'https://code.jquery.com/jquery-2.2.4.js',
      'label': 'jQuery 2.2.4',
      'group': 'jQuery'
    },
    {
      'url': 'https://code.jquery.com/jquery-2.1.4.js',
      'label': 'jQuery 2.1.4',
      'group': 'jQuery'
    },
    {
      'url': 'https://code.jquery.com/jquery-2.0.3.js',
      'label': 'jQuery 2.0.3',
      'group': 'jQuery'
    },
    {
      'url': 'https://code.jquery.com/jquery-1.12.4.js',
      'label': 'jQuery 1.12.4',
      'group': 'jQuery'
    },
    {
      'url': 'https://code.jquery.com/jquery-1.11.3.js',
      'label': 'jQuery 1.11.3',
      'group': 'jQuery'
    },
    {
      'url': 'https://code.jquery.com/jquery-1.10.2.js',
      'label': 'jQuery 1.10.2',
      'group': 'jQuery'
    },
    {
      'url': 'https://code.jquery.com/jquery-1.9.1.js',
      'label': 'jQuery 1.9.1',
      'group': 'jQuery'
    },
    {
      'url': 'https://code.jquery.com/jquery-1.8.3.js',
      'label': 'jQuery 1.8.3',
      'group': 'jQuery'
    },
    {
      'url': 'https://code.jquery.com/jquery-1.7.2.js',
      'label': 'jQuery 1.7.2',
      'group': 'jQuery'
    },
    {
      'url': 'https://code.jquery.com/jquery-1.6.4.js',
      'label': 'jQuery 1.6.4',
      'group': 'jQuery'
    },
    {
      'url': [
        'https://code.jquery.com/ui/jquery-ui-git.css',
        'https://code.jquery.com/jquery-git.js',
        'https://code.jquery.com/ui/jquery-ui-git.js'
      ],
      'label': 'jQuery UI WIP (via git)',
      'group': 'jQuery UI'
    },
    {
      'url': [
        'https://code.jquery.com/ui/1.12.1/themes/smoothness/jquery-ui.css',
        'https://code.jquery.com/jquery-3.1.0.js',
        'https://code.jquery.com/ui/1.12.1/jquery-ui.js'
      ],
      'label': 'jQuery UI 1.12.1',
      'group': 'jQuery UI'
    },
    {
      'url': [
        'https://code.jquery.com/ui/1.11.4/themes/smoothness/jquery-ui.css',
        'https://code.jquery.com/jquery-1.12.4.js',
        'https://code.jquery.com/ui/1.11.4/jquery-ui.js'
      ],
      'label': 'jQuery UI 1.11.4',
      'group': 'jQuery UI'
    },
    {
      'url': [
        'https://code.jquery.com/ui/1.10.4/themes/smoothness/jquery-ui.css',
        'https://code.jquery.com/jquery-1.11.3.js',
        'https://code.jquery.com/ui/1.10.4/jquery-ui.js'
      ],
      'label': 'jQuery UI 1.10.4',
      'group': 'jQuery UI'
    },
    {
      'url': [
        'https://code.jquery.com/ui/1.9.2/themes/smoothness/jquery-ui.css',
        'https://code.jquery.com/jquery-1.8.3.js',
        'https://code.jquery.com/ui/1.9.2/jquery-ui.js'
      ],
      'label': 'jQuery UI 1.9.2',
      'group': 'jQuery UI'
    },
    {
      'url': [
        'https://code.jquery.com/mobile/git/jquery.mobile-git.css',
        'https://code.jquery.com/jquery-1.11.3.js',
        'https://code.jquery.com/mobile/git/jquery.mobile-git.js'
      ],
      'label': 'jQuery Mobile WIP (via git)',
      'group': 'jQuery Mobile'
    },
    {
      'url': [
        'https://code.jquery.com/mobile/1.4.2/jquery.mobile-1.4.2.css',
        'https://code.jquery.com/jquery-1.11.3.js',
        'https://code.jquery.com/mobile/1.4.2/jquery.mobile-1.4.2.js'
      ],
      'label': 'jQuery Mobile 1.4.2',
      'group': 'jQuery Mobile'
    },
    {
      'url': [
        'https://code.jquery.com/mobile/1.3.2/jquery.mobile-1.3.2.css',
        'https://code.jquery.com/jquery-1.9.1.js',
        'https://code.jquery.com/mobile/1.3.2/jquery.mobile-1.3.2.js'
      ],
      'label': 'jQuery Mobile 1.3.2',
      'group': 'jQuery Mobile'
    },
    {
      'url': [
        'https://code.jquery.com/mobile/1.2.1/jquery.mobile-1.2.1.css',
        'https://code.jquery.com/jquery-1.8.3.js',
        'https://code.jquery.com/mobile/1.2.1/jquery.mobile-1.2.1.js'
      ],
      'label': 'jQuery Mobile 1.2.1',
      'group': 'jQuery Mobile'
    },
    {
      'url': [
        'https://code.jquery.com/mobile/1.1.2/jquery.mobile-1.1.2.css',
        'https://code.jquery.com/jquery-1.6.4.js',
        'https://code.jquery.com/mobile/1.1.2/jquery.mobile-1.1.2.js'
      ],
      'label': 'jQuery Mobile 1.1.2',
      'group': 'jQuery Mobile'
    },
    {
      'url': [
        'https://code.jquery.com/jquery.min.js',
        'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css',
        'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js'
      ],
      'label': 'Bootstrap Latest',
      'group': 'Bootstrap'
    },
    {
      'url': [
        'https://code.jquery.com/jquery.min.js',
        'https://netdna.bootstrapcdn.com/twitter-bootstrap/2.3.2/css/bootstrap-combined.min.css',
        'https://netdna.bootstrapcdn.com/twitter-bootstrap/2.3.2/js/bootstrap.min.js'
      ],
      'label': 'Bootstrap 2.3.2',
      'group': 'Bootstrap'
    },
    {
      'url': 'https://ajax.googleapis.com/ajax/libs/prototype/1/prototype.js',
      'label': 'Prototype latest',
      'group': 'Prototype'
    },
    {
      'url': 'https://ajax.googleapis.com/ajax/libs/prototype/1.7/prototype.js',
      'label': 'Prototype 1.7.1',
      'group': 'Prototype'
    },
    {
      'url': 'https://ajax.googleapis.com/ajax/libs/prototype/1.6.1.0/prototype.js',
      'label': 'Prototype 1.6.1.0',
      'group': 'Prototype'
    },
    {
      'url': [
        'https://ajax.googleapis.com/ajax/libs/prototype/1/prototype.js',
        'https://ajax.googleapis.com/ajax/libs/scriptaculous/1/scriptaculous.js'
      ],
      'label': 'script.aculo.us latest',
      'group': 'Prototype'
    },
    {
      'url': [
        'https://ajax.googleapis.com/ajax/libs/prototype/1/prototype.js',
        'https://ajax.googleapis.com/ajax/libs/scriptaculous/1.8.3/scriptaculous.js'
      ],
      'label': 'script.aculo.us 1.8.3',
      'group': 'Prototype'
    },
    {
      'url': 'http://yui.yahooapis.com/3.10.0/build/yui/yui.js',
      'label': 'YUI 3.10.0',
      'group': 'YUI'
    },
    {
      'url': 'http://yui.yahooapis.com/2.9.0/build/yuiloader/yuiloader-min.js',
      'label': 'YUI 2.9.0',
      'group': 'YUI'
    },
    {
      'url': 'https://ajax.googleapis.com/ajax/libs/mootools/1.5.0/mootools-yui-compressed.js',
      'label': 'MooTools 1.5.0',
      'group': 'MooTools'
    },
    {
      'url': 'https://ajax.googleapis.com/ajax/libs/mootools/1.5.0/mootools-nocompat-yui-compressed.js',
      'label': 'MooTools 1.5.0 (without 1.2+ compatibility layer)',
      'group': 'MooTools'
    },
    {
      'url': 'https://ajax.googleapis.com/ajax/libs/mootools/1.4.5/mootools-yui-compressed.js',
      'label': 'MooTools 1.4.5',
      'group': 'MooTools'
    },
    {
      'url': 'https://ajax.googleapis.com/ajax/libs/dojo/1/dojo/dojo.js',
      'label': 'Dojo latest',
      'group': 'Dojo'
    },
    {
      'url': 'https://ajax.googleapis.com/ajax/libs/dojo/1.8/dojo/dojo.js',
      'label': 'Dojo 1.8.4',
      'group': 'Dojo'
    },
    {
      'url': 'https://ajax.googleapis.com/ajax/libs/dojo/1.7/dojo/dojo.js',
      'label': 'Dojo 1.7.4',
      'group': 'Dojo'
    },
    {
      'url': [
        'https://ajax.googleapis.com/ajax/libs/dojo/1/dijit/themes/claro/claro.css',
        'https://ajax.googleapis.com/ajax/libs/dojo/1/dojo/dojo.js'
      ],
      'label': 'Dijit latest (Claro)',
      'group': 'Dojo'
    },
    {
      'url': [
        'https://ajax.googleapis.com/ajax/libs/dojo/1.8.4/dijit/themes/claro/claro.css',
        'https://ajax.googleapis.com/ajax/libs/dojo/1.8.4/dojo/dojo.js'
      ],
      'label': 'Dijit 1.8.4 (Claro)',
      'group': 'Dojo'
    },
    {
      'url': [
        'https://ajax.googleapis.com/ajax/libs/dojo/1.7.4/dijit/themes/claro/claro.css',
        'https://ajax.googleapis.com/ajax/libs/dojo/1.7.4/dojo/dojo.xd.js'
      ],
      'label': 'Dijit 1.7.4 (Claro)',
      'group': 'Dojo'
    },
    {
      'url': [
        'https://da7xgjtj801h2.cloudfront.net/2015.2.624/styles/kendo.common.min.css',
        'https://da7xgjtj801h2.cloudfront.net/2015.2.624/styles/kendo.silver.min.css',
        'https://code.jquery.com/jquery-2.1.4.min.js',
        'https://da7xgjtj801h2.cloudfront.net/2015.2.624/js/kendo.ui.core.min.js'
      ],
      'label': 'Kendo UI Core 2015.2.624',
      'group': 'Kendo UI'
    },
    {
      'url': [
        'https://da7xgjtj801h2.cloudfront.net/2014.3.1411/styles/kendo.common.min.css',
        'https://da7xgjtj801h2.cloudfront.net/2014.3.1411/styles/kendo.default.min.css',
        'https://code.jquery.com/jquery-1.9.1.min.js',
        'https://da7xgjtj801h2.cloudfront.net/2014.3.1411/js/kendo.ui.core.min.js'
      ],
      'label': 'Kendo UI Core 2014.3.1411',
      'group': 'Kendo UI'
    },
    {
      'url' : [
        'https://code.jquery.com/qunit/qunit-git.css',
        'https://code.jquery.com/qunit/qunit-git.js'
      ],
      'label': 'QUnit',
      'group': 'Testing'
    },
    {
      'url' : [
      'https://cdnjs.cloudflare.com/ajax/libs/require.js/2.1.14/require.js',
    ],
      'label': 'RequireJS',
      'group': 'AMD'
    },
    {
      'url': 'http://zeptojs.com/zepto.min.js',
      'label': 'Zepto latest',
      'group': 'Zepto'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/zepto/1.0/zepto.min.js',
      'label': 'Zepto 1.0',
      'group': 'Zepto'
    },
    {
      'url':'https://ajax.googleapis.com/ajax/libs/angularjs/1.4.0/angular.min.js',
      'label': 'Angular 1.4.0 Stable',
      'group': 'Angular'
    },
    {
      'url': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.4.0/angular.js',
      'label': 'Angular 1.4.0 Stable Uncompressed',
      'group': 'Angular'
    },
    {
      'url':'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.15/angular.min.js',
      'label': 'Angular 1.3.15 Stable',
      'group': 'Angular'
    },
    {
      'url': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.3.15/angular.js',
      'label': 'Angular 1.3.15 Stable Uncompressed',
      'group': 'Angular'
    },
    {
      'url': 'https://ajax.googleapis.com/ajax/libs/angularjs/1.2.26/angular.min.js',
      'label': 'Angular 1.2.26 Legacy',
      'group': 'Angular'
    },
    {
      'url':'https://rawgit.com/angular/bower-angular/master/angular.min.js',
      'label': 'Angular Latest',
      'group': 'Angular'
    },
    {
      'url': 'https://rawgit.com/angular/bower-angular/master/angular.js',
      'label': 'Angular Latest Uncompressed',
      'group': 'Angular'
    },
    {
      'url': 'https://rawgit.com/angular/bower-angular-animate/master/angular-animate.min.js',
      'label': 'Angular Animate Latest',
      'group': 'Angular'
    },
    {
      'url': 'https://rawgit.com/angular/bower-angular-aria/master/angular-aria.min.js',
      'label': 'Angular Aria Latest',
      'group': 'Angular'
    },
    {
      'url': 'https://rawgit.com/angular/bower-angular-messages/master/angular-messages.min.js',
      'label': 'Angular Messages Latest',
      'group': 'Angular'
    },
    {
      'url': 'https://rawgit.com/angular/bower-angular-resource/master/angular-resource.min.js',
      'label': 'Angular Resource Latest',
      'group': 'Angular'
    },
    {
      'url': 'https://rawgit.com/angular/bower-angular-route/master/angular-route.min.js',
      'label': 'Angular Route Latest',
      'group': 'Angular'
    },
    {
      'url': 'https://rawgit.com/angular/bower-angular-sanitize/master/angular-sanitize.min.js',
      'label': 'Angular Sanitize Latest',
      'group': 'Angular'
    },
    {
      'url': ['https://fb.me/react-15.1.0.js', 'https://fb.me/react-dom-15.1.0.js'],
      'label': 'React + React DOM 15.1.0',
      'group': 'React'
    },
    {
      'url': ['https://fb.me/react-with-addons-15.1.0.js', 'https://fb.me/react-dom-15.1.0.js'],
      'label': 'React with Add-Ons + React DOM 15.1.0',
      'group': 'React'
    },
    {
      'url': ['https://fb.me/react-0.14.7.js', 'https://fb.me/react-dom-0.14.7.js'],
      'label': 'React + React DOM 0.14.7',
      'group': 'React'
    },
    {
      'url': ['https://fb.me/react-with-addons-0.14.7.js', 'https://fb.me/react-dom-0.14.7.js'],
      'label': 'React with Add-Ons + React DOM 0.14.7',
      'group': 'React'
    },
    {
      'url': 'https://fb.me/react-0.13.3.js',
      'label': 'React 0.13.3',
      'group': 'React'
    },
    {
      'url': 'https://fb.me/react-with-addons-0.13.3.js',
      'label': 'React with Add-Ons 0.13.3',
      'group': 'React'
    },
    {
      'url': 'https://cdn.rawgit.com/zloirock/core-js/master/client/shim.min.js',
      'label': 'core-js',
      'group': 'shims'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/es5-shim/2.0.8/es5-shim.min.js',
      'label': 'ES5 shim 2.0.8',
      'group': 'shims'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/blissfuljs/1.0.2/bliss.min.js',
      'label': 'Bliss 1.0.2',
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/vue/1.0.16/vue.js',
      'label': 'Vue.js 1.0.16',
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/vue/2.0.3/vue.js',
      'label': 'Vue.js 2.0.3',
    },
    {
      'url': 'http://cdn.ractivejs.org/latest/ractive.js',
      'label': 'Ractive.js'
    },
    {
      'url': [
        'http://nightly.enyojs.com/latest/enyo-nightly/enyo.css',
        'http://nightly.enyojs.com/latest/enyo-nightly/enyo.js',
        'http://nightly.enyojs.com/latest/lib/layout/package.js',
        'http://nightly.enyojs.com/latest/lib/onyx/package.js',
        'http://nightly.enyojs.com/latest/lib/g11n/package.js',
        'http://nightly.enyojs.com/latest/lib/canvas/package.js'
      ],
      'label': 'Enyo latest',
      'group': 'Enyo'
    },
    {
      'url': [
        'http://enyojs.com/enyo-2.2.0/enyo.css',
        'http://enyojs.com/enyo-2.2.0/enyo.js',
        'http://enyojs.com/enyo-2.2.0/lib/layout/package.js',
        'http://enyojs.com/enyo-2.2.0/lib/onyx/package.js',
        'http://enyojs.com/enyo-2.2.0/lib/g11n/package.js',
        'http://enyojs.com/enyo-2.2.0/lib/canvas/package.js'
      ],
      'label': 'Enyo 2.2.0',
      'group': 'Enyo'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/bluebird/1.2.2/bluebird.js',
      'label': 'Bluebird 1.2.2',
      'group': 'Promises'
    },
    {
      'url': 'https://www.promisejs.org/polyfills/promise-4.0.0.js',
      'label': 'Promise 4.0.0',
      'group': 'Promises'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/q.js/1.0.1/q.js',
      'label': 'Q 1.0.1',
      'group': 'Promises'
    },
    {
      'url': [
        'https://rawgithub.com/ai/autoprefixer-rails/master/vendor/autoprefixer.js'
      ],
      'label': 'Autoprefixer',
      'snippet': '<style type="unprocessed" id="AutoprefixerIn">%css%</style>\n<style id="AutoprefixerOut"></style>\n<script>\nAutoprefixerSettings = ""; //Specify here the browsers you want to target or leave empty\ndocument.getElementById("AutoprefixerOut").innerHTML = autoprefixer(AutoprefixerSettings || null).process(document.getElementById("AutoprefixerIn").innerHTML).css;\n</script>'
    },
    {
      'url': [
        'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/backbone.js/1.1.2/backbone-min.js'
      ],
      'label': 'Backbone 1.1.2'
    },
    {
      'url': [
        'https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/backbone.js/1.1.2/backbone-min.js',
        'http://marionettejs.com/downloads/backbone.marionette.min.js'
      ],
      'label': 'MarionetteJS latest'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/bonsai/0.4/bonsai.min.js',
      'label': 'Bonsai 0.4.latest'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/coffee-script/1.9.2/coffee-script.min.js',
      'label': 'CoffeeScript'
    },
    {
      'url': [
        'https://code.jquery.com/jquery-1.11.1.min.js',
        '//builds.emberjs.com/tags/v1.13.5/ember-template-compiler.js',
        '//builds.emberjs.com/tags/v1.13.5/ember.debug.js'
      ],
      'label': 'Ember.js 1.13.5',
      'group': 'Ember'
    },
    {
      'url': '//builds.emberjs.com/tags/v1.13.6/ember-data.js',
      'label': 'Ember Data 1.13.6',
      'group': 'Ember'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/normalize/3.0.2/normalize.min.css',
      'label': 'Normalize.css 3.0.2'
    },
    {
      'url': [
        '//extjs.cachefly.net/ext-3.1.0/resources/css/ext-all.css',
        'https://cdnjs.cloudflare.com/ajax/libs/ext-core/3.1.0/ext-core.min.js'
      ],
      'label': 'ext-core 3.1.0'
    },
    {
      'url': [
        'https://cdnjs.cloudflare.com/ajax/libs/foundation/5.5.2/css/normalize.min.css',
        'https://cdnjs.cloudflare.com/ajax/libs/foundation/5.5.2/css/foundation.min.css',
        'https://cdnjs.cloudflare.com/ajax/libs/foundation/5.5.2/js/vendor/modernizr.js',
        'https://cdnjs.cloudflare.com/ajax/libs/foundation/5.5.2/js/vendor/jquery.js',
        'https://cdnjs.cloudflare.com/ajax/libs/foundation/5.5.2/js/foundation.min.js'
      ],
      'label': 'Foundation 5.5.2'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/1.0.0/handlebars.js',
      'label': 'Handlebars.js 1.0.0'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/knockout/3.3.0/knockout-min.js',
      'label': 'Knockout 3.3.0'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/less.js/1.3.3/less.min.js',
      'label': 'Less 1.3.3'
    },
    {
      'url': 'https://cdn.jsdelivr.net/lodash/4/lodash.min.js',
      'label': 'lodash 4.x',
      'group': 'Lodash'
    },
    {
      'url': 'https://cdn.jsdelivr.net/g/lodash@4(lodash.min.js+lodash.fp.min.js)',
      'label': 'lodash fp 4.x',
      'group': 'Lodash'
    },
    {
      'url': 'https://cdn.jsdelivr.net/lodash/3/lodash.min.js',
      'label': 'lodash 3.x',
      'group': 'Lodash'
    },
    {
      'url': 'http://modernizr.com/downloads/modernizr-latest.js',
      'label': 'Modernizr Development latest'
    },
    {
      'url': [
        'https://cdnjs.cloudflare.com/ajax/libs/modernizr/2.6.2/modernizr.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/detectizr/1.5.0/detectizr.min.js'
      ],
      'label': 'Detectizr 1.5.0'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/prefixfree/1.0.7/prefixfree.min.js',
      'label': 'Prefixfree 1.0.7'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/processing.js/1.4.1/processing-api.min.js',
      'label': 'Processing 1.4.1'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/d3/4.2.3/d3.min.js',
      'label': 'D3 4.2.3',
      'group': 'D3'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.6/d3.min.js',
      'label': 'D3 3.5.6',
      'group': 'D3'
    },
    {
      'url': '//code.highcharts.com/highcharts.js',
      'label': 'Highcharts latest'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/raphael/2.1.0/raphael-min.js',
      'label': 'Rapha&euml;l 2.1.0'
    },
    {
      'url': [
        '//cdn.jsdelivr.net/chartist.js/latest/chartist.min.js',
        '//cdn.jsdelivr.net/chartist.js/latest/chartist.min.css'
      ],
      'label': 'Chartist.js latest'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/sammy.js/0.7.4/sammy.min.js',
      'label': 'Sammy 0.7.4'
    },
    {
      'url': [
        'http://cdn.sencha.io/touch/1.1.0/resources/css/sencha-touch.css',
        'http://cdn.sencha.io/touch/1.1.0/sencha-touch.js'
      ],
      'label': 'Sencha Touch'
    },
    {
      'url': [
        jsbin.static + '/js/vendor/traceur.js'
      ],
      'label': 'Traceur'
    },
    {
      'url': '//remy.github.io/twitterlib/twitterlib.min.js',
      'label': 'TwitterLib'
    },
    {
      'url': '//jashkenas.github.io/underscore/underscore-min.js',
      'label': 'underscore'
    },
    {
      'url':[
        'https://code.jquery.com/jquery.min.js',
        '//canjs.com/release/2.0.3/can.jquery.min.js'
      ],
      'label': 'CanJS 2.0.3'
    },
    {
      'url':[
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r82/three.min.js'
      ],
      'label': 'Three.js r82'
    },
    {
      'url':[
        'https://cdnjs.cloudflare.com/ajax/libs/html5shiv/3.6.2/html5shiv.js'
      ],
      'label': 'HTML5 shiv'
    },
    {
      'url': [
        'https://cdnjs.cloudflare.com/ajax/libs/polymer/0.3.3/platform.js',
        'https://cdnjs.cloudflare.com/ajax/libs/polymer/0.3.3/polymer.js'
      ],
      'label': 'Polymer 0.3.3'
    },
    {
      'url':[
        'https://code.getmdl.io/1.2.1/material.indigo-pink.min.css',
        'https://code.getmdl.io/1.2.1/material.min.js',
        'https://fonts.googleapis.com/icon?family=Material+Icons'
        ],
      'label': 'Material Design Lite 1.2.1'
    },
    {
      'url': '//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.min.css',
      'label': 'Font Awesome 4.0.3'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.9.12/paper.js',
      'label': 'Paper.js 0.9.12'
    },
    {
      'url': {
        'url': 'https://openui5.hana.ondemand.com/resources/sap-ui-core.js',
        'id': 'sap-ui-bootstrap',
        'data-sap-ui-theme': 'sap_belize',
        'data-sap-ui-libs': 'sap.m'
      },
      'label': 'OpenUI5 CDN (belize Theme, mobile library)'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/gsap/1.11.7/TweenMax.min.js',
      'label': 'GSAP 1.11.7'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/phaser/2.0.5/phaser.min.js',
      'label': 'Phaser 2.0.5'
    },
    {
      'url': [
        '//vjs.zencdn.net/5.11/video-js.css',
        '//vjs.zencdn.net/5.11/video.js'
      ],
      'label': 'Video.js 5.11.x'
    },
    {
      'url': [
        'https://aui-cdn.atlassian.com/aui-adg/5.7.0/js/aui.js',
        'https://aui-cdn.atlassian.com/aui-adg/5.7.0/css/aui.css',
        'https://aui-cdn.atlassian.com/aui-adg/5.7.0/js/aui-experimental.js',
        'https://aui-cdn.atlassian.com/aui-adg/5.7.0/css/aui-experimental.css'
      ],
      'label': 'AUI (Atlassian UI) 5.7.0'
    },
    {
      'url': 'https://cdn.firebase.com/js/client/2.0.2/firebase.js',
      'label': 'Firebase 2.0.2'
    },
    {
      'url': [
        'https://code.ionicframework.com/1.0.0-beta.13/js/ionic.bundle.min.js',
        'https://code.ionicframework.com/1.0.0-beta.13/css/ionic.min.css'
      ],
      'label': 'Ionic 1.0.0-beta-13'
    },
    {
      'url': '//static.opentok.com/v2/js/opentok.min.js',
      'label': 'OpenTok v2.x (latest)'
    },
    {
      'url': 'https://cdn.jsdelivr.net/riot/2.6/riot+compiler.min.js',
      'label': 'Riot + Compiler (latest 2.6.x)'
    },
    {
      'url': [
        'https://unpkg.com/blaze/dist/blaze.min.css',
        'https://unpkg.com/blaze/dist/blaze.colors.min.css'
      ],
      'label': 'Blaze CSS (latest)'
    },
    {
      'url': 'https://unpkg.com/@reactivex/rxjs@5.0.3/dist/global/Rx.js',
      'label': 'RxJS 5.0.3',
      'group': 'RxJS'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/rxjs/4.0.6/rx.all.js',
      'label': 'rx.all 4.0.6',
      'group': 'RxJS'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/rxjs/4.0.6/rx.all.compat.js',
      'label': 'rx.all.compat 4.0.6',
      'group': 'RxJS'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/rxjs/4.0.6/rx.testing.js',
      'label': 'rx.testing 4.0.6',
      'group': 'RxJS'
    },
    {
      'url': 'https://unpkg.com/rx-dom@7.0.3/dist/rx.dom.js',
      'label': 'rx.dom 7.0.3 (requires 4.x)',
      'group': 'RxJS'
    },
    {
      'url': 'http://cdn.popcornjs.org/code/dist/popcorn.min.js',
      'label': 'Popcorn.js 1.5.6 (Core)',
      'group': 'Popcorn.js'
    },
    {
      'url': 'http://cdn.popcornjs.org/code/dist/popcorn-complete.min.js',
      'label': 'Popcorn.js 1.5.6 (Core + Extensions)',
      'group': 'Popcorn.js'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/immutable/3.7.3/immutable.min.js',
      'label': 'Immutable 3.7.3',
      'group': 'Data structures'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/mori/0.3.2/mori.js',
      'label': 'mori 0.3.2',
      'group': 'Data structures'
    },
    {
      'url': 'https://cdnjs.cloudflare.com/ajax/libs/ramda/0.22.1/ramda.min.js',
      'label': 'Ramda 0.22.1'
    },
    {
      'url': [
        'https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.2.2/semantic.min.css',
        'https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.2.2/semantic.min.js'
      ],
      'label': 'Semantic UI 2.2.2'
    },
    {
      'url': 'https://cdn.jsdelivr.net/pouchdb/latest/pouchdb.min.js',
      'label': 'PouchDB (latest)',
      'group': 'PouchDB'
    },
    {
      'url': 'https://cdn.jsdelivr.net/momentjs/2.14.1/moment-with-locales.min.js',
      'label': 'Moment 2.14.1',
      'group': 'Moment.js'
    },
    {
      'url': [
        'https://cdn.jsdelivr.net/momentjs/2.14.1/moment-with-locales.min.js',
        'https://cdn.jsdelivr.net/momentjs/2.14.1/locales.min.js'
      ],
      'label': 'Moment 2.14.1 (with locales)',
      'group': 'Moment.js'
    },
    {
      'url': '//cdn.jsdelivr.net/velocity/1.2.3/velocity.min.js',
      'label': 'Velocity JS 1.2.3',
      'group': 'Velocity'
    },
    {
      'url': '//cdn.jsdelivr.net/velocity/1.2.3/velocity.ui.min.js',
      'label': 'Velocity UI Pack 1.2.3',
      'group': 'Velocity'
    }
  ];

  window.libraries = libraries; // expose a command line API

  libraries.userSpecified = JSON.parse(store.localStorage.getItem('libraries') || '[]');
  for (var i = 0; i < libraries.userSpecified.length; i++) {
    libraries.push(libraries.userSpecified[i]);
  }

  libraries.add = function (lib) {
    // Extract each script from a list (as documented) or use the default way
    if (lib.scripts) {
      lib.scripts.forEach(function (script) {
        script.group = lib.text;
        script.label = script.text;
        libraries.userSpecified.push(script);
        libraries.push(script);
      });
    } else {
      // Adding a lib according to the above schema
      lib.group = 'Custom';
      libraries.userSpecified.push(lib);
      libraries.push(lib);
    }
    try {
      store.localStorage.setItem('libraries', JSON.stringify(this.userSpecified));
    } catch (e) {} // just in case of DOM_22 error, makes me so sad to use this :(
    $('#library').trigger('init');
  };

  libraries.clear = function () {
    libraries.userSpecified = [];
    store.localStorage.removeItem('libraries');
    var length = libraries.length;
    for (var i = 0; i < length; i++) {
      if (libraries[i].group === 'Custom') {
        libraries.splice(i, 1);
        length--;
      }
    }
    // force a refresh?
    $('#library').trigger('init');
  };

  return coder.editors.libraries = libraries;
});
define('skylark-jsbin-coder/editors/library',[
  "skylark-jquery",
   "../jsbin",
   "../coder",
   "./panels",
   "./libraries",
  "../chrome/analytics"

],function ($,jsbin,coder,panels, libraries, analytics) {
  /*global $:true, editors:true, libraries:true, analytics:true */
  // 'use strict'; // this causes bigger issues :-\

  var $library = $('#library, #alt-library'),
      groups = {};

  $library.bind('init', function () {
    var i = 0,
      j = 0,
      k = 0,
      library = {},
      groupOrder = [],
      group = {},
      groupLabel = '',
      lcGroup = '';

    // reset
    groups = {};
    $library.empty();

    for (i = 0; i < libraries.length; i++) {
      library = libraries[i];
      groupLabel = library.group || 'Other';
      lcGroup = groupLabel.toLowerCase().replace(/[^a-z0-9]/ig, '');
      if (groupOrder.indexOf(lcGroup) === -1) {
        group = { label: groupLabel, libraries: [], key: lcGroup };
        groups[lcGroup] = group;
        groupOrder.push(lcGroup);
      } else {
        group = groups[lcGroup];
      }

      group.libraries.push(library);
    }

    var html = ['<option value="none">None</option>'];

    for (i = 0; i < groupOrder.length; i++) {
      group = groups[groupOrder[i]];
      html.push('<option value="" data-group="' + group.label + '" class="heading">-------------</option>');

      for (j = 0; j < group.libraries.length; j++) {
        library = group.libraries[j];
        html.push('<option value="' + group.key + ':' + j + '">' + library.label + '</option>');
      }
    }

    $library.html( html.join('') );
  }).trigger('init');


  $library.bind('change', function () {
    if (!this.value) { return; }

    var selected = this.value.split(':'),
        group = groups[selected[0]],
        library = group.libraries[selected[1]];

    analytics.library('select', group.libraries[selected[1]].label);
    insertResources(library.url);
    if (library.snippet) {
      insertSnippet(library.snippet);
    }
  }).on('click', function () {
    analytics.library('open');
  });

  function insertResources(urls) {
    if (!$.isArray(urls)) {
      urls = [urls];
    }

    var i = 0,
        length = urls.length,
        url = '',
        code = panels.named.html.getCode(), // editors => panels.named
        state = { line: panels.named.html.editor.currentLine(), // editors => panels.named
          character: panels.named.html.editor.getCursor().ch, // editors => panels.named
          add: 0
        },
        html = [],
        file = '',
        resource,
        attrList,
        attrs,
        scriptDefaultAttrs = {},
        cssDefaultAttrs = { 'rel': 'stylesheet', 'type': 'text/css' };

    for (i = 0; i < length; i++) {
      url = urls[i];

      // URLs can be objects carrying desired attributes
      // The main resource (src, href) property is always 'url'
      if ($.isPlainObject(url)) {
        attrs = url;
        url = url.url;
        delete attrs.url;
      } else {
        attrs = {};
      }

      file = url.split('/').pop();

      // Introduce any default attrs and flatten into a list for insertion
      attrs = $.extend({}, (isCssFile(file) ? cssDefaultAttrs : scriptDefaultAttrs), attrs);
      attrList = '';
      for (var attr in attrs) {
        attrList += ' ' + attr + '="' + attrs[attr] + '"';
      }

      if (file && code.indexOf(file + '"')) {
        // attempt to lift out similar scripts
        if (isCssFile(file)) {
          code = code.replace(new RegExp('<link.*href=".*?/' + file + '".*?/>\n?'), '');
        } else {
          code = code.replace(new RegExp('<script.*src=".*?/' + file + '".*?><' + '/script>\n?'), '');
        }
        state.add--;
      }

      if (isCssFile(url)) {
        resource = '<' + 'link href="' + url + '"' + attrList  + ' />';
      } else {
        resource = '<' + 'script src="' + url + '"' + attrList + '><' + '/script>';
      }

      if (isJadeActive()) {
        resource = isCssFile(url) ? htmlLinkToJade(resource) : htmlScriptToJade(resource);
      }

      html.push(resource);

      state.add++;
    }

    if (isJadeActive()) {
      // always append Jade at the end, it's just easier that way...okay?
      var indent = (code.match(/html.*\n(\s*)\S?/i) || [,])[1];
      code = code.trim() + '\n' + indent + html.join('\n' + indent).trim();
    } else {
      if (code.indexOf('<head') !== -1) {
        var codeLines = code.split('\n');
        codeLines.splice(state.line, 0, html.join('\n'));
        code = codeLines.join('\n');
      } else { // add to the start of the doc
        code = html.join('\n') + code;
      }
    }

    panels.named.html.setCode(code); // editors => panels.named
    panels.named.html.editor.setCursor({ line: state.line + state.add, ch: state.character }); // editors => panels.named

  }

  function insertSnippet(snippet) {
    var code = panels.named.html.getCode(), // editors => panels.named
        state = { line: panels.named.html.editor.currentLine(),
          character: panels.named.html.editor.getCursor().ch,
          add: 0
        };

    if (code.indexOf('</head') !== -1) {
      code = code.replace(/<\/head>/i, snippet + '\n</head>');
    } else { // add to the start of the doc
      code = snippet + '\n' + code;
    }

    panels.named.html.setCode(code); // editors => panels.named
    panels.named.html.editor.setCursor({ line: state.line + state.add, ch: state.character }); // editors => panels.named
  }

  function createHTMLToJadeTagConverter(tagName, attribute, suffix){
    var regExToGrabResource = new RegExp(attribute+'=(\'|").+.'+suffix+'\\1');
    return function(html){
      var resource = html.match(regExToGrabResource);
      return tagName+'('+resource[0]+')';
    };
  }

  var htmlScriptToJade = createHTMLToJadeTagConverter('script', 'src', 'js');
  // Dirty, but good enough for now, parse the link and add commas between attributes;
  var htmlLinkToJade = (function(){
    var parseLink = createHTMLToJadeTagConverter('link', 'href', 'css');
    return function(html){
      var jadeLink = parseLink(html);
      return jadeLink.split('" ').join('",');
    };
  }());

  function isJadeActive(){
    return jsbin.state.processors.html === 'jade';
  }

  function isCssFile(url) {
    return (url.length - (url.lastIndexOf('.css') + 4) === 0);
  }

  
});
define('skylark-jsbin-coder/editors/tern',[
  "skylark-jquery",
  "../jsbin",
  "../coder",
  "./codemirror"
],function ($,jsbin,coder,CodeMirror) {
  'use strict';
  /*globals $, jsbin, CodeMirror, template, ternDefinitions, ternBasicDefs */

  if (true || jsbin.embed || jsbin.mobile) {
    return;
  }

  var ternServer;
  var ternLoaded = {};

  var initTern = function(editor, defs){
    var keyMap = {
      'Ctrl-Q': function(cm) { ternServer.selectName(cm); },
      'Ctrl-I': function(cm) { ternServer.showType(cm); },
      'Ctrl-Space': function(cm) { ternServer.complete(cm); }
    };
    if (typeof defs === 'undefined') {
      defs = [];
    }
    ternServer = new CodeMirror.TernServer({
      defs: defs,
      useWorker: false,
      cm: editor
    });
    editor.addKeyMap(keyMap);
    editor.on('cursorActivity', function(cm) { ternServer.updateArgHints(cm); });
  };

  var addTernDefinition = function(def) {
    if (typeof ternServer === 'object') {
      ternServer.options.defs.push(def);
      ternServer = new CodeMirror.TernServer({
        defs: ternServer.options.defs,
        useWorker: ternServer.options.useWorker,
        tooltipType: ternServer.options.tooltipType,
        cm: ternServer.options.cm
      });
    }
  };

  // Load the json defition of the library
  var loadTernDefinition = function(name, file) {
    if (!ternLoaded[name]) {
      $.ajax({
        url: file,
        dataType: 'json',
        success: function(data) {
          addTernDefinition(data);
          ternLoaded[name] = true;
        }
      });
    }
  };

  // Load the actual js library
  var loadTernFile = function(name, file) {
    if (!ternLoaded[name]) {
      $.ajax({
        url: file,
        dataType: 'script',
        success: function(data) {
          ternServer.server.addFile(name, data);
          ternLoaded[name] = true;
        }
      });
    }
  };

  var loadTern = function(editor) {
    initTern(editor, ternBasicDefs);
    ternLoaded.ecma5 = true;
    ternLoaded.browser = true;
  };

  var searchTernDefinition = function(htmlCode) {
    for (var i = 0; i < ternDefinitions.length; i++) {
      if (ternDefinitions[i].match.test(htmlCode)) {
        if (ternDefinitions[i].type === 'def') {
          loadTernDefinition(ternDefinitions[i].name, ternDefinitions[i].file);
        } else {
          loadTernFile(ternDefinitions[i].name, ternDefinitions[i].file);
        }
      }
    }
  };

  // Overwrite the autocomplete function to use tern
  CodeMirror.commands.autocomplete = function(cm) {
    if (CodeMirror.snippets(cm) === CodeMirror.Pass) {
      var pos = cm.getCursor();
      var tok = cm.getTokenAt(pos);
      var indent = '';
      if (cm.options.indentWithTabs) {
        indent = '\t';
      } else {
        indent = new Array(cm.options.indentUnit * 1 + 1).join(' ');
      }

      // I don't like this - feel like we shouldnt be pseudo parsing the code around the cursor. - FO
      // the && here is in the correct place, if the token type is null, but the token string is '.'
      // then we're probably at the end of an object lookup so let's use tern for autocomplete
      if (tok.string === ';' || tok.type === 'string' || tok.type === null && tok.string !== '.') {
        return cm.replaceRange(indent, pos);
      }
      if (tok.string.trim() !== '') {
        return ternServer.complete(cm);
      }
      return cm.replaceRange(indent, pos);
    }
  };

  CodeMirror.startTern = function() {
    loadTern(jsbin.panels.panels.javascript.editor);
    searchTernDefinition(jsbin.panels.panels.html.getCode());

    $('#library').bind('change', function () {
      searchTernDefinition(jsbin.panels.panels.html.getCode());
    });
  };

  return coder.editors.tern = {
    startTern
  };
});

define('skylark-jsbin-coder/editors/addons',[
  "skylark-jquery",
   "../jsbin",
   "../coder",
   "./codemirror",
   "./panels",
   "./tern"
],function ($,jsbin,coder,CodeMirror,panels) {
  'use strict';
  /*globals $, jsbin, CodeMirror*/

  // ignore addons for embedded views
  if (jsbin.embed || jsbin.mobile) {
    return;
  }

  var processors = jsbin.state.processors;

  var defaults = {
    closebrackets: true,
    highlight: false,
    vim: false,
    emacs: false,
    trailingspace: false,
    fold: false,
    sublime: false,
    tern: false,
    activeline: true,
    matchbrackets: false
  };

  if (!jsbin.settings.addons) {
    jsbin.settings.addons = defaults;
  }

  var detailsSupport = 'open' in document.createElement('details');

  var settingsHints = {};
  var settingsHintShow = {};
  var hintShow = {
    console: true,
    line: false,
    under: false,
    gutter: false
  };
  // css must go last for the moment due to CSSLint creating the
  // global variable 'exports'
  ['js', 'html', 'coffeescript', 'css'].forEach(function (val) {
    var h = val + 'hint';
    var d = false;
    if (val === 'js') {
      d = true;
    }
    settingsHints[h] = (jsbin.settings[h] !== undefined) ? jsbin.settings[h] : d;
  });

  settingsHintShow = $.extend({}, hintShow, jsbin.settings.hintShow);
  settingsHintShow.tooltip = settingsHintShow.gutter;
  var settingsAddons = $.extend({}, jsbin.settings.addons, settingsHints);

  var addons = {
    closebrackets: {
      url: [
      ///'/js/vendor/codemirror5/addon/edit/closebrackets.js'
      ],
      test: defaultTest('autoCloseBrackets'),
      done: function (cm) {
        setOption(cm, 'autoCloseBrackets', true);
      }
    },
    highlight: {
      url: [
      ///'/js/vendor/codemirror5/addon/search/match-highlighter.js'
      ],
      test: defaultTest('highlightSelectionMatches'),
      done: function (cm) {
        setOption(cm, 'highlightSelectionMatches', true);
      }
    },
    vim: {
      url: [
      ///  '/js/vendor/codemirror5/keymap/vim.js'
      ],
      test: defaultTest('vimMode'),
      done: function (cm) {
        setOption(cm, 'vimMode', true);
        setOption(cm, 'showCursorWhenSelecting', true);
      }
    },
    emacs: {
      url: [
      ///  '/js/vendor/codemirror5/keymap/emacs.js'
      ],
      test: function () {
        return CodeMirror.keyMap.emacs;
      },
      done: function (cm) {
        setOption(cm, 'keyMap', 'emacs');
      }
    },
    matchtags: {
      url: [
      ///  '/js/vendor/codemirror5/addon/fold/xml-fold.js',
      ///  '/js/vendor/codemirror5/addon/edit/matchtags.js'
      ],
      test: function () {
        return CodeMirror.scanForClosingTag &&
               CodeMirror.optionHandlers.matchTags;
      },
      done: function (cm) {
        setOption(cm, 'matchTags', { bothTags: true });
        cm.addKeyMap({'Ctrl-J': 'toMatchingTag' });
      }
    },
    trailingspace: {
      url: [
         ///'/js/vendor/codemirror5/addon/edit/trailingspace.js'
      ],
      test: defaultTest('showTrailingSpace'),
      done: function (cm) {
        setOption(cm, 'showTrailingSpace', true);
      }
    },
    fold: {
      url: [
      ///  '/js/vendor/codemirror5/addon/fold/foldgutter.css',
      ///  '/js/vendor/codemirror5/addon/fold/foldcode.js',
      ///  '/js/vendor/codemirror5/addon/fold/foldgutter.js',
      ///  '/js/vendor/codemirror5/addon/fold/brace-fold.js',
      ///  '/js/vendor/codemirror5/addon/fold/xml-fold.js',
      ///  '/js/vendor/codemirror5/addon/fold/comment-fold.js'
      ],
      test: function () {
        return CodeMirror.helpers.fold &&
               CodeMirror.optionHandlers.foldGutter &&
               CodeMirror.optionHandlers.gutters;
      },
      done: function (cm) {
        $body.addClass('code-fold');
        cm.addKeyMap({'Ctrl-Q': function (cm) {
          cm.foldCode(cm.getCursor());
        }});
        setOption(cm, 'foldGutter', true);
        var gutters = cm.getOption('gutters');
        var copyGutters = gutters.slice();
        copyGutters.push('CodeMirror-foldgutter');
        setOption(cm, 'gutters', copyGutters);
      }
    },
    sublime: {
      url: [
      ///  '/js/vendor/codemirror5/keymap/sublime.js'
      ],
      test: function () {
        return CodeMirror.keyMap.sublime;
      },
      done: function (cm) {
        setOption(cm, 'keyMap', 'sublime');
        // Keys that CodeMirror should never take over
        var cmd = $.browser.platform === 'mac' ? 'Cmd' : 'Ctrl';
        delete CodeMirror.keyMap['sublime'][cmd + '-L'];
        delete CodeMirror.keyMap['sublime'][cmd + '-T'];
        delete CodeMirror.keyMap['sublime'][cmd + '-W'];
        delete CodeMirror.keyMap['sublime'][cmd + '-J'];
        delete CodeMirror.keyMap['sublime'][cmd + '-R'];
        delete CodeMirror.keyMap['sublime'][cmd + '-Enter'];
        delete CodeMirror.keyMap['sublime'][cmd + '-Up'];
        delete CodeMirror.keyMap['sublime'][cmd + '-Down'];
        CodeMirror.keyMap['sublime']['Shift-Tab'] = 'indentAuto';
        cm.removeKeyMap('noEmmet');
      }
    },
    tern: {
      url: [
      ///  '/js/vendor/codemirror5/addon/hint/show-hint.css',
      ///  '/js/vendor/codemirror5/addon/tern/tern.css',
      ///  '/js/vendor/codemirror5/addon/hint/show-hint.js',
      ///  '/js/prod/addon-tern-' + jsbin.version + '.min.js'
      ],
      test: function () {
        return (typeof window.ternBasicDefs !== 'undefined') &&
               CodeMirror.showHint &&
               CodeMirror.TernServer &&
               CodeMirror.startTern;
      },
      done: function () {
        CodeMirror.startTern();
      }
    },
    activeline: {
      url: [
      ///  '/js/vendor/codemirror5/addon/selection/active-line.js'
      ],
      test: function() {
        return (typeof CodeMirror.defaults.styleActiveLine !== 'undefined');
      },
      done: function(cm) {
        setOption(cm, 'styleActiveLine', true);
      }
    },
    matchbrackets: {
      url: [],
      test: function() {
        return (typeof CodeMirror.defaults.matchBrackets !== 'undefined');
      },
      done: function(cm) {
        setOption(cm, 'matchBrackets', true);
      }
    },
    csshint: {
      url: [
       /// '/js/vendor/csslint/csslint.min.js',
       /// '/js/vendor/cm_addons/lint/css-lint.js'
      ],
      test: function() {
        return hintingTest('css') &&
               (typeof CSSLint !== 'undefined');
      },
      done: function(cm) {
        if (cm.getOption('mode') !== 'css') {
          return;
        }

        if (processors.css !== undefined && processors.css !== 'css') {
          return;
        }
        hintingDone(cm);
      }
    },
    jshint: {
      url: [
        // because jshint uses new style set/get - so we sniff for IE8 or lower
        // since it's the only one that doesn't have it
        ///$.browser.msie && $.browser.version < 9 ?
        ///'/js/vendor/jshint/jshint.old.min.js' :
        ///'/js/vendor/jshint/jshint.min.js',
      ],
      test: function() {
        return hintingTest('javascript') &&
               (typeof JSHINT !== 'undefined');
      },
      done: function(cm) {
        if (cm.getOption('mode') !== 'javascript') {
          return;
        }

        if (processors.javascript !== undefined && processors.javascript !== 'javascript') {
          return;
        }

        hintingDone(cm, {
          'eqnull': true
        });
      }
    },
    htmlhint: {
      url: [
       /// '/js/vendor/htmlhint/htmlhint.js',
       /// '/js/vendor/cm_addons/lint/html-lint.js'
      ],
      test: function() {
        return hintingTest('htmlmixed') &&
               (typeof HTMLHint !== 'undefined');
      },
      done: function(cm) {
        if (cm.getOption('mode') !== 'htmlmixed') {
          return;
        }

        if (processors.html !== undefined && processors.html !== 'html') {
          return;
        }

        hintingDone(cm);
      }
    },
    coffeescripthint: {
      url: [
       /// '/js/vendor/coffeelint/coffeelint.min.js',
       /// '/js/vendor/cm_addons/lint/coffeescript-lint.js'
      ],
      test: function() {
        return hintingTest('coffeescript') &&
               (typeof coffeelint !== 'undefined');
      },
      done: function(cm) {
        if (cm.getOption('mode') !== 'coffeescript' || jsbin.state.processors.javascript !== 'coffeescript') {
          return;
        }
        hintingDone(cm);
      }
    }
  };

  // begin loading user addons


  var $body = $('body');

  function load(url) {
    if (url.indexOf('http') !== 0) {
      url = jsbin.static + url;
    }

    if (url.slice(-3) === '.js') {
      return $.ajax({
        url: url + '?' + jsbin.version, // manual cache busting
        dataType: 'script',
        cache: true
      });
    } else if (url.slice(-4) === '.css') {
      var d = $.Deferred();
      setTimeout(function () {
        $body.append('<link rel="stylesheet" href="' + url + '?' + jsbin.version + '">');
        d.resolve();
      }, 0);
      return d;
    }
  }

  function ready(test) {
    var d = $.Deferred();
    var timer = null;

    if (test()) {
      d.resolve();
    } else {
      var start = new Date().getTime();
      var last = new Date();
      timer = setInterval(function () {
        last = new Date();
        if (test()) {
          clearInterval(timer);
          d.resolve();
        } else if (last.getTime() - start > 10 * 1000) {
          clearInterval(timer);
          d.reject();
        }
      }, 100);
    }

    return d;
  }

  function setOption(cm, option, value) {
    cm.setOption(option, value);
  }

  function defaultTest(prop) {
    return function () {
      return (typeof CodeMirror.optionHandlers[prop] !== 'undefined');
    };
  }

  function hintingTest(mode) {
    return (typeof CodeMirror.defaults.lint !== 'undefined') &&
           CodeMirror.helpers.lint &&
           CodeMirror.helpers.lint[mode] &&
           CodeMirror.optionHandlers.lint;
  }

  window.hintingDone = function(cm, defhintOptions) {
    var mode = cm.getOption('mode');
    if (mode === 'javascript') {
      mode = 'js';
    }
    if (mode === 'htmlmixed') {
      mode = 'html';
    }
    var opt = $.extend({}, settingsHintShow);
    opt.consoleParent = cm.getWrapperElement().parentNode.parentNode;
    setOption(cm, 'lintOpt', opt);
    if (opt.gutter) {
      var gutters = cm.getOption('gutters');
      if (gutters.indexOf('CodeMirror-lint-markers') === -1) {
        var copyGutters = gutters.slice();
        copyGutters.push('CodeMirror-lint-markers');
        setOption(cm, 'gutters', copyGutters);
      }
      var ln = cm.getOption('lineNumbers');
      setOption(cm, 'lineNumbers', !ln);
      setOption(cm, 'lineNumbers', ln);
    }

    setOption(cm, 'lint', { delay: 800, options: $.extend({}, defhintOptions, jsbin.settings[mode + 'hintOptions']) });

    if (opt.console && cm.consolelint) {
      $document.trigger('sizeeditors');
      $(cm.consolelint.head).on('click', function() {
        if (!detailsSupport) {
          $(this).nextAll().toggle();
        }
        // trigger a resize after the click has completed and the details is close
        setTimeout(function () {
          $document.trigger('sizeeditors');
        }, 10);
      });
    }
  }

  var options = Object.keys(settingsAddons);

  function loadAddon(key) {
    var addon = addons[key];
    if (addon && settingsAddons[key]) {
      if (typeof addon.url === 'string') {
        addon.url = [addon.url];
      }

      // dirty jQuery way of doing .done on an array of promises
      $.when.call($, addon.url.map(load)).done(function () {
        if (addon.done) {
          ready(addon.test).then(function () {
            panels.allEditors(function (panel) {
              if (panel.editor) {
                addon.done(panel.editor);
              }
            });
          });
        }
      });
    }
  }

  options.forEach(loadAddon);

  // External method to realod all the addons
  window.reloadAddons = function(arr) {
    if (arr) {
      arr.forEach(loadAddon);
    } else {
      options.forEach(loadAddon);
    }
  };

  // External method to realod the selected addon
  // may be useful in the future
  // window.reloadSelectedAddon = function(addon) {
  //   if (options.indexOf(addon) !== -1) {
  //     loadAddon(addon);
  //   }
  // };

});

define('skylark-jsbin-coder/updateTitle',[
  "skylark-jquery",
   "./jsbin"
],function ($,jsbin) {
  function updateTitle(source) {
    'use strict';
    /*globals jsbin, documentTitle, $*/
    if (source === undefined) {
      source = jsbin.panels.panels.html.getCode();
    }
    // read the element out of the source code and plug it in to our document.title
    var newDocTitle = source.match(updateTitle.re);
    if (newDocTitle !== null && newDocTitle[1] !== documentTitle) {
      updateTitle.lastState = jsbin.state.latest;
      documentTitle = $('<div>').html(newDocTitle[1].trim()).text(); // jshint ignore:line
      if (documentTitle) {
        document.title = documentTitle + ' - ' + 'JS Bin';

        // add the snapshot if not the latest
      } else {
        document.title = 'JS Bin';
      }


      if (!jsbin.state.latest && jsbin.state.revision) {
        document.title = '(#' + jsbin.state.revision + ') ' + document.title;
      }
    }

    // there's an edge case here if newDocTitle === null, it won't update to show
    // the snapshot, but frankly, it's an edge case that people won't notice.

  }

  updateTitle.re = /<title>(.*)<\/title>/i;
  updateTitle.lastState = null;

  return jsbin.coder.updateTitle = updateTitle;
});
define('skylark-jsbin-coder/editors/snapshot',[
  "skylark-jquery",
   "../jsbin",
   "../coder",
   "../updateTitle"
],function ($,jsbin,coder,updateTitle) {
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
          jsbin.saveChecksum = false; // jshint ignore:line
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
define('skylark-jsbin-coder/editors/beautify',[
  "skylark-jquery",
   "../jsbin",
   "../coder",
   "./panels"
],function ($,jsbin,coder,panels) {
  'use strict';
  /*globals $, jsbin, objectValue */

  var settings = jsbin.settings || {};
  var customKeys = settings.keys || {};

  if (jsbin.embed || customKeys.disabled) {
    return;
  }

  function beautify() {

    var focusedPanel = panels.focused;
    var beautifyUrls = {
      html: jsbin['static'] + '/js/vendor/beautify/beautify-html.js',
      css: jsbin['static'] + '/js/vendor/beautify/beautify-css.js',
      js: jsbin['static'] + '/js/vendor/beautify/beautify.js'
    };

    if (jsbin.state.processors[focusedPanel.id] === 'html') {
      if (!window.html_beautify) {
        lazyLoadAndRun(beautifyUrls.html, beautifyHTML);
      } else {
        beautifyHTML();
      }
    } else if (jsbin.state.processors[focusedPanel.id] === 'css') {
      if (!window.css_beautify) {
        lazyLoadAndRun(beautifyUrls.css, beautifyCSS);
      } else {
        beautifyCSS();
      }
    } else if (jsbin.state.processors[focusedPanel.id] === 'javascript') {
      if (!window.js_beautify) {
        lazyLoadAndRun(beautifyUrls.js, beautifyJS);
      } else {
        beautifyJS();
      }
    }

  }

  function lazyLoadAndRun(url, callback) {
    $.getScript(url).done(callback);
  }

  function beautifyHTML() {
    runBeautifier(panels.focused, window.html_beautify);
  }

  function beautifyCSS() {
    runBeautifier(panels.focused, window.css_beautify);
  }

  function beautifyJS() {
    runBeautifier(panels.focused, window.js_beautify);
  }

  function runBeautifier(panel, beautifier) {
    panel.editor.setCode(beautifier(panel.editor.getCode(), {
      indent_size: settings.editor ? settings.editor.indentUnit || 2 : 2
    }));
  }

  var ctrlKey = $.browser.platform === 'mac' ? 'metaKey' : 'ctrlKey'

  $(document).on('keydown', function beautifyKeyBinding(e) {
    if (e[ctrlKey] && e.shiftKey && e.which == 76) {
      // ctrl/command + shift + L
      beautify();
    }
  });

  return coder.editors.beautify =  beautify;

});

define('skylark-jsbin-coder/render/upgradeConsolePanel',[
	"skylark-jsbin-console",
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

    jsbin.$document.one('jsbinReady', function () {
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
define('skylark-jsbin-coder/init',[
	"skylark-jsbin-console",
	"skylark-jsbin-renderer",
	"./jsbin",
	"./coder",
	"./editors/panels",
	"./editors/snapshot",
	"./render/upgradeConsolePanel"
],function(jsconsole,renderer,jsbin,coder,panels,snapshot,upgradeConsolePanel) {

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
	  jsbin.$document.bind('codeChange.live', codeChangeLive);


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
define('skylark-jsbin-coder/main',[
	"./coder",
    "./editors/mobileCodeMirror",
    "./editors/mobile-command-maps",
    "./editors/mobile-keyboard",
    "./editors/keycontrol",
    "./editors/panel",
    "./editors/panels",
    "./editors/libraries",
    "./editors/library",
    "./editors/addons",
    "./editors/snapshot",
    "./editors/beautify",
    "./init"

],function(coder){
	return coder;
});
define('skylark-jsbin-coder', ['skylark-jsbin-coder/main'], function (main) { return main; });


},this);
//# sourceMappingURL=sourcemaps/skylark-jsbin-coder.js.map
