const parseString = require('xml2js').parseString
const R = require('ramda')

// --------------------------------------------------------------------------------------
// Helper Functions
// --------------------------------------------------------------------------------------
const transformObject = (fn, object) => {
  const transform = R.curry(transformObject)(fn)

  if (Array.isArray(object)) return R.map(transform, object)

  let result = R.clone(object)

  R.forEachObjIndexed((v, k) => {
    if (Array.isArray(v)) {
      result[k] = R.map(transform, v)
    } else {
      if (R.type(v) === 'Object') {
        const test = fn(v)
        result[k] = transform(test)
      } else {
        result[k] = fn(v)
      }
    }
  }, object)

  result = fn(result)
  return result
}

const transformArray = (fn, object) => {
  const transform = R.curry(transformArray)(fn)

  if (Array.isArray(object)) {
    const test = fn(object)
    if (test === object) {
      return R.map(transform, object)
    } else {
      return transform(test)
    }
  }

  let result = R.clone(object)

  R.forEachObjIndexed((v, k) => {
    if (Array.isArray(v)) {
      const test = fn(v)
      if (test === v) {
        result[k] = R.map(transform, v)
      } else {
        result[k] = transform(test)
      }
    } else {
      if (R.type(v) === 'Object') {
        result[k] = transform(v)
      }

      result[k] = fn(v)
    }
  }, object)

  result = fn(result)
  return result
}

const flattenElement = (key, object) => {
  if (R.type(object) === 'Array') return R.map(R.curry(flattenElement)(key), object)
  if (R.type(object) !== 'Object') return object
  if (R.not(R.has(key))) return object

  const value = object[key]
  if (R.type(value) === 'Array') return R.map(R.curry(flattenElement)(key), value)
  if (R.type(value) !== 'Object') return object
  const result = R.dissoc(key, object)

  return R.merge(result, value)
}

const flattenAllElements = (key, object) => {
  if (Array.isArray(object)) return R.map(R.curry(flattenAllElements)(key), object)
  let result = R.clone(object)
  R.forEachObjIndexed((v, k) => {
    if (Array.isArray(v)) {
      result[k] = R.map(R.curry(flattenAllElements)(key), v)
    } else {
      if (R.type(v) === 'Object') {
        result[k] = flattenAllElements(key, v)
      }
      result[k] = flattenElement(key, v)
    }
  }, object)

  result = flattenElement(key, result)
  return result
}

const reduceValueObject = object => {
  if (R.type(object) === 'Object' && R.keys(object).length === 1 && object.value) {
    return object.value
  }

  return object
}

const reduceSingleValueArray = array => {
  if (R.type(array) === 'Array' && array.length === 1) {
    return array[0]
  }

  return array
}

// Der Parser sammelt Text in '_'. Ggf weitere Attribute (documentation könnte ja complexer content sein) werden ignoriert
const reduceDocumentation = object => {
  if (object['_']) {
    return object['_']
  }

  return object
}

const collectMeta = object => {
  const metas = R.filter(
    n => !R.contains(n, ['element', 'simpleType', 'complexType', 'group']),
    R.keys(object)
  )

  const meta = {}
  R.forEach(key => {
    meta[key] = object[key]
    delete object[key]
  }, metas)

  object.meta = meta

  return object
}

// --------------------------------------------------------------------------------------
// Tag Processors: name => name
// --------------------------------------------------------------------------------------

const killPrefix = name => {
  if (name.indexOf('xs:') === 0) return name.substr(3)
  if (name.indexOf('xsd:') === 0) return name.substr(4)
  return name
}

const renameRef = name => {
  if (name.toLowerCase() === 'ref') return 'reference'
  return name
}

// --------------------------------------------------------------------------------------
// Value processors: (value, name) => value
// --------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------
// Schema processors: object => object
// --------------------------------------------------------------------------------------

const pullDownElements = R.curry(flattenAllElements)('$')
const reduceValues = R.curry(transformObject)(reduceValueObject)
const reduceArrays = R.curry(transformArray)(reduceSingleValueArray)
const reduceDocumentations = R.curry(transformObject)(reduceDocumentation)

// --------------------------------------------------------------------------------------
// options for parsing the xsd
// --------------------------------------------------------------------------------------

const processors = {
  normalize: true,
  attrNameProcessors: [renameRef],
  tagNameProcessors: [killPrefix],
  schemaProcessors: [
    pullDownElements,
    reduceValues,
    reduceArrays,
    reduceDocumentations,
    collectMeta
  ]
}

// --------------------------------------------------------------------------------------

// Parse routine

// --------------------------------------------------------------------------------------

exports.parseXSD = (xsd, cb) => {
  parseString(xsd, processors, (err, json) => {
    if (err) {
      cb(err)
    } else {
      if (R.keys(json).length > 1) throw new Error('invalide Struktur')

      const key = R.keys(json)[0]
      if (R.isNil(key)) {
        console.log('ERROR in getStructuredObject ==> ' + JSON.stringify(json))
      }

      let schema = json[key]

      R.forEach(
        func => (schema = func(schema)),
        R.defaultTo([R.identity], processors.schemaProcessors)
      )

      cb(null, schema)
    }
  })
}

// --------------------------------------------------------------------------------------
// Test Exporte
// --------------------------------------------------------------------------------------

exports.helpers = {
  flattenElement,
  flattenAllElements,
  killPrefix
}
