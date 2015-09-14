'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

require('babel/polyfill');

var _glob = require('glob');

var _glob2 = _interopRequireDefault(_glob);

var _rootsUtil = require('roots-util');

var _rootsUtil2 = _interopRequireDefault(_rootsUtil);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _readYaml = require('read-yaml');

var _readYaml2 = _interopRequireDefault(_readYaml);

var _lodashGet = require('lodash.get');

var _lodashGet2 = _interopRequireDefault(_lodashGet);

// A dictionary mapping translation file paths to translation file contents
var langMap = new Map();

// The RegEx to query each template for translation references. e.g. looks for `{{ homepage.welcome }}`
var templateRegEx = /\{\{\s*(\S+)\s*\}\}/g;

/**
 * Pure function to translate a view template file
 * @param  {String} content  The file content
 * @param  {String} langFile The file's path
 * @return {String}          The file content, translated
 */
function translate(content, langFile) {
  return content.replace(templateRegEx, function (match, capture) {
    return (0, _lodashGet2['default'])(langMap.get(langFile), capture);
  });
}

/**
 * Pure function to get the 2-letter language code, given a filename e.g. `es.yaml` -> `es`
 * @param  {String} langFile The file's path
 * @return {String}          The 2-letter language code
 */
function getLang(langFile) {
  return _path2['default'].basename(langFile, _path2['default'].extname(langFile));
}

/**
 * Returns the roots-i18n class
 * @param  {String} translations  A globbing pattern that matches all your translation yaml files
 * @param  {String} viewExtension This tells roots-i18n how to identify your view templates
 * @param  {String} templatesGlob Where to find roots-records "single view templates"
 * @return {Class}                The roots-i18n class
 */

exports['default'] = function (_ref) {
  var translations = _ref.translations;
  var viewExtension = _ref.viewExtension;
  var templatesGlob = _ref.templatesGlob;

  return (function () {
    function I18n(roots) {
      _classCallCheck(this, I18n);

      this.category = 'views'; // @Jeff is this ok? Really don't understand what the category is for

      this.util = new _rootsUtil2['default'](roots);

      // Gets all the translation files, using `translations` – the user-supplied globbing pattern
      this.langFiles = _glob2['default'].sync(_path2['default'].join(roots.root, translations));

      // Populate the langMap
      this.langFiles.forEach(function (langFile) {
        return langMap.set(langFile, _readYaml2['default'].sync(langFile));
      });
    }

    _createClass(I18n, [{
      key: 'fs',
      value: function fs() {
        var _this = this;

        return {
          extract: true,

          // Get all templates using `viewExtension` – the user-supplied extension string
          detect: function detect(file) {
            return _this.util.with_extension(file, [viewExtension]);
          }
        };
      }
    }, {
      key: 'compile_hooks',
      value: function compile_hooks() {
        var _this2 = this;

        return { // TODO use async methods and return Promise

          // Called for every view template
          write: function write(_ref2) {
            var roots = _ref2.roots;
            var file_options = _ref2.file_options;
            var content = _ref2.content;
            return(

              // Start iterating over our languages (as defined by the list of langFiles)
              // Return the translated content and the langFile path
              _this2.langFiles.map(function (langFile) {
                return [translate(content, langFile), langFile];
              }).map(function (_ref3) {
                var _ref32 = _slicedToArray(_ref3, 2);

                var content = _ref32[0];
                var langFile = _ref32[1];

                var p = file_options._path,
                    dir = _path2['default'].dirname(p),
                    ext = _path2['default'].extname(p),
                    name = _path2['default'].basename(p, ext),
                    lang = getLang(langFile);

                // Redirect Roots to write A FILE FOR EACH LANGUAGE, with 'en' as the default
                return {
                  content: content,

                  // Old code, may be useful later:
                  //
                  // path: path.join('.', dir, `${name}.${lang}${ext}`),
                  // extension: `${lang}${ext}`

                  path: lang === 'en' ?
                  // Put English in the root output
                  _path2['default'].join('.', dir, '' + name + ext) :
                  // And other languages in their subdirectories
                  _path2['default'].join('.', lang, dir, '' + name + ext)

                };
              })
            );
          }
        };
      }

      // The following is ONLY for roots-records "single view templates"
    }, {
      key: 'category_hooks',
      // Old code, may be useful later:
      //
      // path: path.join('.', dir, `${name}${ext}.${lang}`),
      // extension: `${ext}.${lang}`.substr(1)
      value: function category_hooks() {
        var self = this;

        // A Set to hold references to view templates that have been processed,
        // so we don't do them multiple times (this was happening, can't remember why)
        if (!this.done) this.done = new Set();

        return {
          after: function after(ctx) {
            // If user hasn't supplied `templatesGlob` (i.e. they're not using roots-records)
            // don't do anything
            if (!templatesGlob) return false;else {

              _glob2['default'].sync(_path2['default'].join(ctx.roots.config.output, templatesGlob)).filter(function (file) {

                // Check the Set, don't do it twice
                if (self.done.has(file)) return false;
                // Shortcut for add to Set and return true
                else return self.done.add(file);
              })

              // Get the content of each "single view template"
              .map(function (filePath) {
                return [filePath, _fs2['default'].readFileSync(filePath, 'utf8')];
              }).forEach(function (_ref4) {
                var _ref42 = _slicedToArray(_ref4, 2);

                var filePath = _ref42[0];
                var content = _ref42[1];

                // As above, for each template, iterate over our languages and translate
                self.langFiles.forEach(function (langFile) {

                  // Translate the file
                  var replacement = translate(content, langFile),

                  // `filePath` is the template's path
                  pathArr = filePath.split(_path2['default'].sep),

                  // `output` is the output folder (usually `public/`)
                  output = pathArr.shift(),

                  // Get the path of where the template is in the source folder
                  // (usually `views/...`)
                  origPath = _path2['default'].join.apply(_path2['default'], _toConsumableArray(pathArr)),
                      lang = getLang(langFile),

                  // Get the path of where the translated template should be written
                  newPath = _path2['default'].join(output, lang === 'en' ? '' : lang, origPath);

                  // Make sure the required destination exists
                  _mkdirp2['default'].sync(_path2['default'].dirname(newPath));

                  // Write the translated view
                  _fs2['default'].writeFileSync(newPath, replacement);
                });
              });
            }
          }
        };
      }
    }]);

    return I18n;
  })();
};

module.exports = exports['default'];
