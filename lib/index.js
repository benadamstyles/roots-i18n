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

var langMap = new Map();
var templateRegEx = /\{\{\s*(\S+)\s*\}\}/g;

function translate(content, langFile) {
  return content.replace(templateRegEx, function (match, capture) {
    return (0, _lodashGet2['default'])(langMap.get(langFile), capture);
  });
}

function getLang(langFile) {
  return _path2['default'].basename(langFile, _path2['default'].extname(langFile));
}

exports['default'] = function (_ref) {
  var translations = _ref.translations;
  var viewExtension = _ref.viewExtension;
  var templatesGlob = _ref.templatesGlob;

  return (function () {
    function I18n(roots) {
      _classCallCheck(this, I18n);

      this.category = 'views';
      this.util = new _rootsUtil2['default'](roots);
      this.langFiles = _glob2['default'].sync(_path2['default'].join(roots.root, translations));
      this.done = new Set();

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
          write: function write(_ref2) {
            var roots = _ref2.roots;
            var file_options = _ref2.file_options;
            var content = _ref2.content;
            return _this2.langFiles.map(function (langFile) {
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

              return {
                content: content,

                // path: path.join('.', dir, `${name}.${lang}${ext}`),
                // extension: `${lang}${ext}`

                path: lang === 'en' ? _path2['default'].join('.', dir, '' + name + ext) : _path2['default'].join('.', lang, dir, '' + name + ext)

              };
            });
          }
        };
      }
    }, {
      key: 'category_hooks',
      // path: path.join('.', dir, `${name}${ext}.${lang}`),
      // extension: `${ext}.${lang}`.substr(1)
      value: function category_hooks() {
        var self = this;

        return {
          after: function after(ctx) {
            _glob2['default'].sync(_path2['default'].join(ctx.roots.config.output, templatesGlob)).filter(function (file) {
              if (self.done.has(file)) return false;else return self.done.add(file);
            }).map(function (filePath) {
              return [filePath, _fs2['default'].readFileSync(filePath, 'utf8')];
            }).forEach(function (_ref4) {
              var _ref42 = _slicedToArray(_ref4, 2);

              var filePath = _ref42[0];
              var content = _ref42[1];

              self.langFiles.forEach(function (langFile) {
                var replacement = translate(content, langFile),
                    pathArr = filePath.split(_path2['default'].sep),
                    output = pathArr.shift(),
                    origPath = _path2['default'].join.apply(_path2['default'], _toConsumableArray(pathArr)),
                    lang = getLang(langFile),
                    newPath = _path2['default'].join(output, lang === 'en' ? '' : lang, origPath);

                _mkdirp2['default'].sync(_path2['default'].dirname(newPath));
                _fs2['default'].writeFileSync(newPath, replacement);
              });
            });
          }
        };
      }
    }]);

    return I18n;
  })();
};

module.exports = exports['default'];
