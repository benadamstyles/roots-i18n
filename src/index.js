import 'babel/polyfill'
import glob from 'glob'
import RootsUtil from 'roots-util'
import path from 'path'
import fs from 'fs'
import mkdirp from 'mkdirp'
import yaml from 'read-yaml'
import get from 'lodash.get'

// A dictionary mapping translation file paths to translation file contents
const langMap = new Map()

// The RegEx to query each template for translation references. e.g. looks for `{{ homepage.welcome }}`
const templateRegEx = /\{\{\s*(\S+)\s*\}\}/g

/**
 * Pure function to translate a view template file
 * @param  {String} content  The file content
 * @param  {String} langFile The file's path
 * @return {String}          The file content, translated
 */
function translate(content, langFile) {
  return content.replace(
    templateRegEx,
    (match, capture) => get(langMap.get(langFile), capture)
  )
}

/**
 * Pure function to get the 2-letter language code, given a filename e.g. `es.yaml` -> `es`
 * @param  {String} langFile The file's path
 * @return {String}          The 2-letter language code
 */
function getLang(langFile) {
  return path.basename(langFile, path.extname(langFile))
}

/**
 * Returns the roots-i18n class
 * @param  {String} translations  A globbing pattern that matches all your translation yaml files
 * @param  {String} viewExtension This tells roots-i18n how to identify your view templates
 * @param  {String} templatesGlob Where to find roots-records "single view templates"
 * @return {Class}                The roots-i18n class
 */
export default function({translations, viewExtension, templatesGlob}) {

  return class I18n {
    constructor(roots) {
      this.category = 'views' // @Jeff is this ok? Really don't understand what the category is for

      this.util = new RootsUtil(roots)

      // Gets all the translation files, using `translations` – the user-supplied globbing pattern
      this.langFiles = glob.sync(path.join(roots.root, translations))

      // Populate the langMap
      this.langFiles.forEach(langFile => langMap.set(langFile, yaml.sync(langFile)))
    }

    fs() {
      return {
        extract: true,

        // Get all templates using `viewExtension` – the user-supplied extension string
        detect: file => this.util.with_extension(file, [viewExtension])
      }
    }

    compile_hooks() {
      return { // TODO use async methods and return Promise

        // Called for every view template
        write: ({roots, file_options, content}) =>

          // Start iterating over our languages (as defined by the list of langFiles)
          // Return the translated content and the langFile path
          this.langFiles.map(langFile => [
            translate(content, langFile),
            langFile
          ]).map(([content, langFile]) => {
            const p = file_options._path,
                  dir = path.dirname(p),
                  ext = path.extname(p),
                  name = path.basename(p, ext),
                  lang = getLang(langFile)

            // Redirect Roots to write A FILE FOR EACH LANGUAGE, with 'en' as the default
            return {
              content,

              // Old code, may be useful later:
              //
              // path: path.join('.', dir, `${name}.${lang}${ext}`),
              // extension: `${lang}${ext}`

              path: lang === 'en' ?
                // Put English in the root output
                path.join('.', dir, `${name}${ext}`) :
                // And other languages in their subdirectories
                path.join('.', lang, dir, `${name}${ext}`),

              // Old code, may be useful later:
              //
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
          // If user hasn't supplied `templatesGlob` (i.e. they're not using roots-records)
          // don't do anything
          if (!templatesGlob) return false
          else {

            // A Set to hold references to view templates that have been processed,
            // so we don't do them multiple times (this was happening, can't remember why)
            const done = new Set()

            glob.sync(path.join(ctx.roots.config.output, templatesGlob))
            .filter(file => {

              // Check the Set, don't do it twice
              if (done.has(file)) return false
              // Shortcut for add to Set and return true
              else return done.add(file)
            })

            // Get the content of each "single view template"
            .map(filePath => [
              filePath,
              fs.readFileSync(filePath, 'utf8')
            ])
            .forEach(([filePath, content]) => {

              // As above, for each template, iterate over our languages and translate
              self.langFiles.forEach(langFile => {

                // Translate the file
                const replacement = translate(content, langFile),

                      // `filePath` is the template's path
                      pathArr = filePath.split(path.sep),

                      // `output` is the output folder (usually `public/`)
                      output = pathArr.shift(),

                      // Get the path of where the template is in the source folder
                      // (usually `views/...`)
                      origPath = path.join(...pathArr),

                      lang = getLang(langFile),

                      // Get the path of where the translated template should be written
                      newPath = path.join(output, (lang === 'en' ? '' : lang), origPath)

                // Make sure the required destination exists
                mkdirp.sync(path.dirname(newPath))

                // Write the translated view
                fs.writeFileSync(newPath, replacement)
              })
            })
          }
        }
      }
    }
  }
}
