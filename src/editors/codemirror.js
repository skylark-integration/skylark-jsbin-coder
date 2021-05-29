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
    "skylark-codemirror/addon/dialog/dialog",
    "skylark-codemirror/addon/search/searchcursor",
    "skylark-codemirror/addon/search/search",
    "skylark-codemirror/addon/hint/anyword-hint",
    "skylark-codemirror/addon/hint/javascript-hint",
    "skylark-codemirror/addon/edit/matchbrackets",
    "skylark-codemirror/addon/comment/comment",
    "skylark-codemirror/addon/lint/javascript-lint",
    "skylark-codemirror/addon/lint/lint",
    "skylark-codemirror/addon/tern/tern"
],function(CodeMirror,coder){

	return coder.editor.CodeMirror = CodeMirror;
});
