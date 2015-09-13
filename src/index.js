import 'babel/polyfill'
import glob from 'glob'
import RootsUtil from 'roots-util'
import path from 'path'
import fs from 'fs'
import mkdirp from 'mkdirp'
import yaml from 'read-yaml'
import get from 'lodash.get'

const langMap = new Map()
const templateRegEx = /\{\{\s*(\S+)\s*\}\}/g

function translate(content, langFile) {
  return content.replace(
    templateRegEx,
    (match, capture) => get(langMap.get(langFile), capture)
  )
}

function getLang(langFile) {
  return path.basename(langFile, path.extname(langFile))
}


export default function({translations, viewExtension, templatesGlob}) {

  return class I18n {
    constructor(roots) {
      this.category = 'views'
      this.util = new RootsUtil(roots)
      this.langFiles = glob.sync(path.join(roots.root, translations))
      this.done = new Set()

      this.langFiles.forEach(langFile => langMap.set(langFile, yaml.sync(langFile)))
    }

    fs() {
      return {
        extract: true,
        detect: file => this.util.with_extension(file, [viewExtension])
      }
    }

    compile_hooks() {
      return { // TODO use async methods and return Promise
        write: ({roots, file_options, content}) =>
          this.langFiles.map(langFile => [
            translate(content, langFile),
            langFile
          ]).map(([content, langFile]) => {
            const p = file_options._path,
                  dir = path.dirname(p),
                  ext = path.extname(p),
                  name = path.basename(p, ext),
                  lang = getLang(langFile)

            return {
              content,

              // path: path.join('.', dir, `${name}.${lang}${ext}`),
              // extension: `${lang}${ext}`

              path: lang === 'en' ?
                path.join('.', dir, `${name}${ext}`) :
                path.join('.', lang, dir, `${name}${ext}`),

              // path: path.join('.', dir, `${name}${ext}.${lang}`),
              // extension: `${ext}.${lang}`.substr(1)
            }
          })
      }
    }

    category_hooks() {
      const self = this

      return {
        after(ctx) {
          glob.sync(path.join(ctx.roots.config.output, templatesGlob))
          .filter(file => {
            if (self.done.has(file)) return false
            else return self.done.add(file)
          })
          .map(filePath => [
            filePath,
            fs.readFileSync(filePath, 'utf8')
          ])
          .forEach(([filePath, content]) => {
            self.langFiles.forEach(langFile => {
              const replacement = translate(content, langFile),
                    pathArr = filePath.split(path.sep),
                    output = pathArr.shift(),
                    origPath = path.join(...pathArr),
                    lang = getLang(langFile),
                    newPath = path.join(output, (lang === 'en' ? '' : lang), origPath)

              mkdirp.sync(path.dirname(newPath))
              fs.writeFileSync(newPath, replacement)
            })
          })
        }
      }
    }
  }
}
