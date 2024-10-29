'use strict';

var fs = require('fs');

function _defineProperty(e, r, t) {
  return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
    value: t,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[r] = t, e;
}
function _toPrimitive(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == typeof i ? i : i + "";
}

// magic number for file type
const MAGIC_NUMBER = '.tbj';
const SIZE_MAGIC_NUMBER = 4;
const VERSION = 1;

// error
const ERROR = -1;

// primitive types
const NULL = 0;
const BOOL = 1;
const UINT8 = 2;
const INT8 = 3;
const UINT16 = 4;
const INT16 = 5;
const UINT32 = 6;
const INT32 = 7;
const FLOAT32 = 8;
const FLOAT64 = 9;

// higher-order types
const STRING = 10;
const ARRAY = 11;
const OBJECT = 12;
const NULLABLE = 13;
const TYPED_ARRAY = 14;
const UNKNOWN = 15;

// extras
const VARIABLE_DEF = 16;
const INSTANCE = 17;
const SIZE_INT8 = 1;
const SIZE_UINT8 = 1;
const SIZE_INT16 = 2;
const SIZE_UINT16 = 2;
const SIZE_INT32 = 4;
const SIZE_UINT32 = 4;
const SIZE_FLOAT32 = 4;
const SIZE_FLOAT64 = 8;

// offsets
const NULLABLE_OFFSET = 16; // support 15 primitives (NULL is reserved and INSTANCE is only for casting)
const TYPED_ARRAY_OFFSET = 32;
const TYPE_OFFSET = 48;
const PROTOTYPE_OFFSET = 64; // support up to 16 types
const NULLABLE_PROTOTYPE_OFFSET = 256; // support up to 192 prototypes
const ARRAY_OFFSET = 512;
const OBJECT_OFFSET = 4096; // support 4x nested array

// legacy offsets
const L_NULLABLE_PROTOTYPE_OFFSET = 160;
const L_ARRAY_OFFSET = 256;
const L_OBJECT_OFFSET = 1024;

// defaults
const DEFAULT_BUFFER_SIZE = 1048576;
const DEFAULT_NUM_ENCODING = FLOAT64;
const DEFAULT_STR_ENCODING = 'utf8';
const DEFAULT_X_FACTOR = 2;

class Prototype {
  constructor(definition, prototype = null, parentCode = null, noInherit = false) {
    this.definition = definition;
    this.prototype = prototype;
    this.parentCode = parentCode;
    this.noInherit = noInherit;
  }
}

class BufferReader {
  constructor(buffer, strEncoding = DEFAULT_STR_ENCODING) {
    _defineProperty(this, "offset", 0);
    this.buffer = buffer;
    this.strEncoding = strEncoding;
  }
  read(type) {
    let data;
    switch (type) {
      case BOOL:
        data = !!this.buffer.readUInt8(this.offset);
        this.offset += SIZE_UINT8;
        break;
      case UINT8:
        data = this.buffer.readUInt8(this.offset);
        this.offset += SIZE_UINT8;
        break;
      case INT8:
        data = this.buffer.readInt8(this.offset);
        this.offset += SIZE_INT8;
        break;
      case UINT16:
        data = this.buffer.readUInt16BE(this.offset);
        this.offset += SIZE_UINT16;
        break;
      case INT16:
        data = this.buffer.readInt16BE(this.offset);
        this.offset += SIZE_INT16;
        break;
      case UINT32:
        data = this.buffer.readUInt32BE(this.offset);
        this.offset += SIZE_UINT32;
        break;
      case INT32:
        data = this.buffer.readInt32BE(this.offset);
        this.offset += SIZE_INT32;
        break;
      case FLOAT32:
        data = this.buffer.readFloatBE(this.offset);
        this.offset += SIZE_FLOAT32;
        break;
      case FLOAT64:
        data = this.buffer.readDoubleBE(this.offset);
        this.offset += SIZE_FLOAT64;
        break;
      case STRING:
        let length;
        if (this.buffer[this.offset] < 128) {
          length = this.read(UINT8);
        } else if (this.buffer[this.offset] < 192) {
          length = this.read(UINT16) - 32768;
        } else {
          length = this.read(UINT32) - 3221225472;
        }
        data = this.buffer.toString(this.strEncoding, this.offset, this.offset + length);
        this.offset += length;
        break;
      case UNKNOWN:
        data = this.read(this.read(UINT8));
    }
    return data;
  }
  readBuffer(length) {
    let buffer = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return buffer;
  }
  readFixedLengthString(length) {
    let data = this.buffer.toString(this.strEncoding, this.offset, this.offset + length);
    this.offset += length;
    return data;
  }
  readTypedArray(type, length) {
    let byteOffset = this.buffer.byteOffset + this.offset;
    let buffer = this.buffer.buffer.slice(byteOffset, byteOffset + length);
    this.offset += length;
    switch (type) {
      case UINT8:
        return new Uint8Array(buffer);
      case INT8:
        return new Int8Array(buffer);
      case UINT16:
        return new Uint16Array(buffer);
      case INT16:
        return new Int16Array(buffer);
      case UINT32:
        return new Uint32Array(buffer);
      case INT32:
        return new Int32Array(buffer);
      case FLOAT32:
        return new Float32Array(buffer);
      case FLOAT64:
        return new Float64Array(buffer);
    }
  }

  /* internal */

  nextNullAt() {
    for (let i = this.offset; i < this.buffer.length; ++i) {
      if (!this.buffer[i]) {
        return i;
      }
    }
    throw new Error('BufferReader could not find a null value');
  }
}

const MAX_BYTES_PER_CHAR_UNICODE = 4;
const MAX_BYTES_PER_CHAR_ASCII = 1;
class BufferWriter {
  get size() {
    return this.buffer.length;
  }
  constructor(size = DEFAULT_BUFFER_SIZE, xFactor = DEFAULT_X_FACTOR, strEncoding = DEFAULT_STR_ENCODING) {
    _defineProperty(this, "offset", 0);
    this.buffer = Buffer.allocUnsafe(size);
    this.xFactor = xFactor;
    this.strEncoding = strEncoding;
    if (strEncoding == 'asci') {
      this.maxBytesPerChar = MAX_BYTES_PER_CHAR_ASCII;
    } else {
      this.maxBytesPerChar = MAX_BYTES_PER_CHAR_UNICODE;
    }
  }
  getBuffer() {
    return this.buffer.slice(0, this.offset);
  }
  grow(size) {
    do {
      this.buffer = Buffer.concat([this.buffer, Buffer.allocUnsafe(this.size * Math.floor(this.xFactor / 2))]);
    } while (size && this.offset + size > this.size);
  }
  write(type, val) {
    switch (type) {
      case NULL:
        val = 0;
      case BOOL:
      case UINT8:
        this.checkSize(SIZE_UINT8);
        this.buffer.writeUInt8(val, this.offset);
        this.offset += SIZE_UINT8;
        break;
      case INT8:
        this.checkSize(SIZE_INT8);
        this.buffer.writeInt8(val, this.offset);
        this.offset += SIZE_INT8;
        break;
      case UINT16:
        this.checkSize(SIZE_UINT16);
        this.buffer.writeUInt16BE(val, this.offset);
        this.offset += SIZE_UINT16;
        break;
      case INT16:
        this.checkSize(SIZE_INT16);
        this.buffer.writeInt16BE(val, this.offset);
        this.offset += SIZE_INT16;
        break;
      case UINT32:
        this.checkSize(SIZE_UINT32);
        this.buffer.writeUInt32BE(val, this.offset);
        this.offset += SIZE_UINT32;
        break;
      case INT32:
        this.checkSize(SIZE_INT32);
        this.buffer.writeInt32BE(val, this.offset);
        this.offset += SIZE_INT32;
        break;
      case FLOAT32:
        this.checkSize(SIZE_FLOAT32);
        this.buffer.writeFloatBE(val, this.offset);
        this.offset += SIZE_FLOAT32;
        break;
      case FLOAT64:
        this.checkSize(SIZE_FLOAT64);
        this.buffer.writeDoubleBE(val, this.offset);
        this.offset += SIZE_FLOAT64;
        break;
      case STRING:
        // empty string
        if (typeof val != 'string' || !val.length) {
          this.write(UINT8, 0);

          // variable length / encoded string
        } else {
          // max possible size
          let size = val.length * this.maxBytesPerChar;
          let lengthSize = size < 128 ? 1 : size < 16384 ? 2 : 4;
          this.checkSize(size + lengthSize);

          // write out string and pre-allocate bytes to hold string length
          size = this.buffer.write(val, this.offset + lengthSize, size, this.strEncoding);

          // R00000000 first bit reserved for signaling to use 2 bytes, max string length is: 2^7 = 128
          if (lengthSize == 1) {
            this.buffer.writeUInt8(size, this.offset);

            // 1R000000 first bit must be 1, second bit reserved for signaling to use 4 bytes, max string length is: 2^16 - (2^15 + 2^14) = 16384
          } else if (lengthSize == 2) {
            this.buffer.writeUInt16BE(size + 32768, this.offset);

            // 11000000 first two bits must be 1, max string length is: 2^32 - (2^31 + 2^30) = 1073741824
          } else {
            this.buffer.writeUInt32BE(size + 3221225472, this.offset);
          }
          this.offset += size + lengthSize;
        }
        break;
      case UNKNOWN:
        switch (typeof val) {
          case 'boolean':
            this.write(UINT8, BOOL);
            this.write(BOOL, val);
            break;
          case 'number':
            this.write(UINT8, FLOAT64);
            this.write(FLOAT64, val);
            break;
          case 'string':
            this.write(UINT8, STRING);
            this.write(STRING, val);
            break;
          default:
            this.write(NULL);
        }
    }
  }
  writeBuffer(buffer) {
    this.checkSize(buffer.length);
    buffer.copy(this.buffer, this.offset);
    this.offset += buffer.length;
  }
  writeFixedLengthString(val) {
    this.checkSize(val.length * this.maxBytesPerChar);
    this.offset += this.buffer.write(val, this.offset, val.length * this.maxBytesPerChar, this.strEncoding);
  }

  /* internal */

  checkSize(size) {
    if (this.offset + size > this.buffer.length) {
      this.grow(size);
    }
  }
}

class StreamBufferReader {
  constructor(stream, size = DEFAULT_BUFFER_SIZE, strEncoding = DEFAULT_STR_ENCODING) {
    this.stream = stream;
    this.size = size;
    this.strEncoding = strEncoding;
    this.tempSize = size;
    this.buffer = Buffer.allocUnsafe(size);
    this.writeOffset = 0;
    this.readOffset = 0;
    this.stream.on('data', chunk => {
      if (this.writeOffset + chunk.length > this.tempSize) {
        this.stream.pause();
      }
      this.buffer.fill(chunk, this.writeOffset, this.writeOffset + chunk.length);
      this.writeOffset += chunk.length;
      if (this.waitingRead) {
        this.waitingRead();
      }
    });
  }
  readUntilNull(fn) {
    for (let i = this.readOffset; i < this.buffer.length; ++i) {
      if (this.buffer[i] == null) {
        fn(this.buffer.slice(this.offset, i));
        this.incReadOffset(i - this.readOffset);
      }
    }
  }
  read(type, length = 0) {
    switch (type) {
      case UINT32:
        this.readBytes(SIZE_UINT32, readOffset => fn(this.buffer.readUInt32(readOffset)));
        break;
      case FLOAT32:
        this.readBytes(SIZE_FLOAT32, readOffset => fn(this.buffer.readFloat32(readOffset)));
        break;
      case STRING:
        if (length) {
          this.readBytes(length, readOffset => fn(this.buffer.toString(this.strEncoding, readOffset, length)));
        } else {
          this.readUntilNull();
        }
    }
  }

  /* internal */

  incReadOffset(length) {
    this.readOffset += length;
    if (this.readOffset > this.size) {
      this.writeOffset = this.buffer.length - this.writeOffset;
      this.readOffset = 0;
      this.newBuffer = Buffer.allocUnsafe(this.size);
      this.newBuffer.fill(this.offset, this.buffer.length);
      this.buffer = this.newBuffer;
      if (this.stream.isPaused()) {
        this.stream.resume();
      }
    }
  }
  readBytes(length) {
    if (this.readOffset + length > this.writeOffset) {
      return new Promise((res, rej) => {
        if (this.size < this.readOffset + length) {
          this.tmpSize = this.readOffset + length;
        }
        this.waitingRead = () => {
          this.tempSize = this.size;
          this.readBytes(length, fn);
        };
      });
    } else {
      let readOffset = this.readOffset;
      this.incReadOffset(length);
      return readOffset;
    }
  }
}

class StreamBufferWriter extends BufferWriter {
  constructor(stream, size, xFactor, strEncoding) {
    super(size, xFactor, strEncoding);
    _defineProperty(this, "streamIndex", 0);
    _defineProperty(this, "streamReady", true);
    this.stream = stream;
  }

  /* internal */

  flush() {
    this.streamReady = this.stream.write(this.buffer.slice(this.streamIndex, this.offset), () => {
      this.streamReady = true;
    });
    if (this.streamReady) {
      this.offset = 0;
      this.streamIndex = 0;
    } else {
      this.streamIndex = this.offset;
    }
    return this.streamReady;
  }
  checkSize(size) {
    if (this.offset + size > this.size) {
      if (this.streamReady && !this.flush()) {
        this.grow();
      } else {
        this.grow();
      }
    }
  }
}

/**
 * Return the parent of a prototype.
 * 
 * @param { function } prototype - prototype to check for parent of 
 */
function getParent(prototype) {
  let parent = prototype ? Object.getPrototypeOf(prototype) : null;
  return parent && parent.name ? parent : null;
}

class Type {
  constructor(ref, size) {
    // a type reference (name) always starts with @
    if (typeof ref == 'string') {
      ref = ref[0] == '@' ? ref : '@' + ref;
    } else {
      ref = null;
    }
    this.ref = ref;
    this.size = size || 0;
  }
  serialize() {}
  deserialize() {}
}

class BigIntType extends Type {
  constructor(ref) {
    super(ref || BigIntType.ref, BigIntType.size);
  }
  serialize(bigint) {
    let buffer = Buffer.allocUnsafe(BigIntType.size);
    buffer.writeBigInt64BE(bigint);
    return buffer;
  }
  deserialize(buffer) {
    return buffer.readBigInt64BE();
  }
}
BigIntType.ref = '@BigInt';
BigIntType.size = 8;

class DateType extends Type {
  constructor(ref) {
    super(ref || DateType.ref, DateType.size);
  }
  serialize(date) {
    let buffer = Buffer.allocUnsafe(DateType.size);
    buffer.writeBigInt64BE(BigInt(date.getTime()));
    return buffer;
  }
  deserialize(buffer) {
    return new Date(Number(buffer.readBigInt64BE()));
  }
}
DateType.ref = '@Date';
DateType.size = 8;

class RegexType extends Type {
  constructor(ref) {
    super(ref || RegexType.ref);
  }
  serialize(regex) {
    let string = regex.toString();
    let buffer = Buffer.allocUnsafe(string.length);
    buffer.write(string, 'utf8');
    return buffer;
  }
  deserialize(buffer) {
    let string = buffer.toString('utf8');
    let flagIndex = string.lastIndexOf('/');
    return new RegExp(string.slice(1, flagIndex), string.slice(flagIndex + 1));
  }
}
RegexType.ref = '@Regex';

/**
 * Cast a plain object into the typed object it represents. Only supports prototype definitions, not strings.
 * 
 * @param { object } obj - object to parse
 * @param { function } prototype - prototype to cast into
 * @param { array } types - array of types with deserializers
 * @param { bool } castPrimitives - also cast primitives (bool, number, string)
 * @param { bool } freeMemory - set obj properties to undefined as the obj is cast (slower, but frees up memory)
 */
function cast(obj, prototype, types, castPrimitives = false, freeMemory = false, definitions = {}) {
  // plain object or array with a definition (ignore prototyped)
  if (prototype && (typeof prototype == 'function' || typeof prototype == 'object')) {
    let isNonNullObject = typeof obj == 'object' && obj;
    let isArray = Array.isArray(prototype);
    let isArrayTypeDef = Array.isArray(prototype) && prototype.length == 2;

    // array
    if (Array.isArray(obj) && isArray) {
      let typedObj;

      // typed array
      if (isArrayTypeDef && prototype[0] == ARRAY) {
        typedObj = new Array(obj.length);
        for (let i = 0; i < obj.length; ++i) {
          typedObj[i] = cast(obj[i], prototype[1], types, castPrimitives, freeMemory, definitions);
          if (freeMemory) {
            obj[i] = undefined;
          }
        }

        // unknown array
      } else {
        typedObj = new Array(prototype.length);
        for (let i = 0; i < prototype.length; ++i) {
          typedObj[i] = cast(obj[i], prototype[i], types, castPrimitives, freeMemory, definitions);
          if (freeMemory) {
            obj[i] = undefined;
          }
        }
      }
      return typedObj;

      // qualified type
    } else if (isArrayTypeDef) {
      switch (prototype[0]) {
        // uniform value object
        case OBJECT:
          let typedObj = {};
          if (isNonNullObject) {
            for (let key in obj) {
              typedObj[key] = cast(obj[key], prototype[1], types, castPrimitives, freeMemory, definitions);
              if (freeMemory) {
                obj[key] = undefined;
              }
            }
          }
          return typedObj;

        // nullable object
        case NULLABLE:
          return obj == null ? null : cast(obj, prototype[1], types, castPrimitives, freeMemory, definitions);

        // variable def, won't know this when casting
        case VARIABLE_DEF:
          return obj;

        // instance object
        case INSTANCE:
          return cast(obj, prototype[1], types, castPrimitives, freeMemory, definitions);
      }

      // non-prototyped object
    } else if (!obj || !obj.constructor || obj.constructor.prototype == Object.prototype) {
      let tbjson = prototype.tbjson;

      // prototype is tbjson with a definition
      if (tbjson && tbjson.definition) {
        let typedObj;
        let definition;

        // call the cast function to instantiate the correct prototype
        if (tbjson.cast) {
          return cast(obj, tbjson.cast(obj), types, castPrimitives, freeMemory, definitions);

          // use the passed prototype
        } else {
          typedObj = new prototype();
        }
        if (isNonNullObject) {
          // use map
          if (definitions[prototype.name]) {
            definition = definitions[prototype.name];

            // check for parent
          } else {
            definition = tbjson.definition;

            // only check for a parent if the definition is an object
            if (typeof definition == 'object') {
              for (let parent = prototype; parent = getParent(parent);) {
                if (!parent.tbjson || !parent.tbjson.definition) {
                  break;
                }
                definition = Object.assign({}, parent.tbjson.definition, definition);
              }
              definitions[prototype.name] = definition;
            }
          }

          // fallback to the prototype if definition is an object
          if (definition == OBJECT) {
            for (let key in typedObj) {
              if (key in obj) {
                typedObj[key] = obj[key];
                if (freeMemory) {
                  obj[key] = undefined;
                }
              }
            }

            // continue deeper
          } else {
            for (let key in definition) {
              if (key in obj) {
                typedObj[key] = cast(obj[key], definition[key], types, castPrimitives, freeMemory, definitions);
                if (freeMemory) {
                  obj[key] = undefined;
                }
              }
            }
          }
        }

        // call the build function for post construction
        if (tbjson.build) {
          tbjson.build(typedObj);
        }
        return typedObj;

        // prototype is a raw definition
      } else {
        let typedObj = {};
        if (isNonNullObject) {
          for (let key in prototype) {
            if (key in obj) {
              typedObj[key] = cast(obj[key], prototype[key], types, castPrimitives, freeMemory, definitions);
              if (freeMemory) {
                obj[key] = undefined;
              }
            }
          }
        }
        return typedObj;
      }
    }
  }
  if (types && typeof prototype == 'string' && typeof obj == 'string' && prototype[0] == '@' && types[prototype]) {
    obj = types[prototype].deserialize(Buffer.from(obj, 'base64'));
  }

  // cast primitive (allow for null)
  if (castPrimitives && typeof prototype == 'number') {
    if (typeof obj != 'bool' && typeof obj != 'number' && typeof obj != 'string') {
      obj = null;

      // bool
    } else if (prototype == BOOL) {
      obj = !!obj;

      // string
    } else if (prototype == STRING) {
      obj = '' + obj;

      // number
    } else if (prototype > BOOL && prototype < STRING) {
      obj = +obj;
    }
  }

  // primitive, untyped, or prototyped
  return obj;
}

/**
 * Clone the typed object into a prototyped object ignoring typing rules, but obeying which properties should be ignored.
 * 
 * @param { string } obj - object to serialize
 */
function clone(obj, definitions = {}) {
  // object or array
  if (obj && typeof obj == 'object') {
    // array
    if (Array.isArray(obj)) {
      let retObj = new Array(obj.length);
      for (let i = 0; i < obj.length; ++i) {
        retObj[i] = clone(obj[i], definitions);
      }
      return retObj;

      // typed array
    } else if (ArrayBuffer.isView(obj)) {
      return obj.slice();

      // object
    } else {
      let retObj = {};

      // typed
      if (typeof obj.constructor == 'function' && obj.constructor.tbjson && obj.constructor.tbjson.definition) {
        let definition = definitions[obj.constructor.name];

        // do a lookup for the parent definitions and flatten into one
        if (!definition) {
          definition = obj.constructor.tbjson.definition;
          for (let parent = obj.constructor; parent = getParent(parent);) {
            if (!parent.tbjson || !parent.tbjson.definition) {
              break;
            }
            definition = Object.assign({}, parent.tbjson.definition, definition);
          }
          definitions[obj.constructor.name] = definition;
        }
        let constructor = obj.constructor;

        // unbuild
        if (constructor.tbjson.unbuild) {
          obj = constructor.tbjson.unbuild(obj);
        }

        // custom clone function
        if (constructor.tbjson.clone) {
          retObj = constructor.tbjson.clone(obj);

          // generic clone function
        } else {
          for (let key in definition) {
            retObj[key] = clone(obj[key], definitions);
          }

          // cast
          retObj = cast(retObj, constructor);
        }

        // date object
      } else if (obj instanceof Date) {
        retObj = new Date(obj.getTime());

        // plain
      } else {
        for (let key in obj) {
          retObj[key] = clone(obj[key], definitions);
        }
      }
      return retObj;
    }
  }

  // primitive
  return obj;
}

/**
 * Return the flattened TBJSON definition. For prototypes that have parents.
 * 
 * @param { obj } obj - object to compute definition of 
 */
function definition(obj) {
  if (obj && typeof obj == 'object' && obj.constructor.tbjson && obj.constructor.tbjson.definition) {
    let definition = obj.constructor.tbjson.definition;
    for (let parent = obj.constructor; parent = getParent(parent);) {
      if (!parent.tbjson || !parent.tbjson.definition) {
        break;
      }
      definition = Object.assign({}, parent.tbjson.definition, definition);
    }
    return definition;
  }
}

/**
 * Convert a validation result object into an array with path selectors and errors.
 * 
 * @param { object | array } obj - validation result object to flatten
 */
function flattenValidation(obj, errors = [], path = []) {
  // recurse
  if (typeof obj == 'object' && obj != null) {
    // root of validation result is an array (validation result contains no arrays once inside)
    if (Array.isArray(obj)) {
      flattenValidation(obj[0], errors, path);

      // object
    } else {
      for (let key in obj) {
        flattenValidation(obj[key], errors, path.concat(key));
      }
    }

    // add to array
  } else {
    errors.push([path, obj]);
  }
  return errors;
}

/**
 * Serialize the typed object into a plain object ignoring typing rules, but obeying which properties should be ignored.
 * 
 * @param { string } obj - object to serialize
 */
function serialize(obj, definitions = {}) {
  // object or array
  if (obj && typeof obj == 'object') {
    // array
    if (Array.isArray(obj)) {
      let retObj = new Array(obj.length);
      for (let i = 0; i < obj.length; ++i) {
        retObj[i] = serialize(obj[i], definitions);
      }
      return retObj;

      // typed array (no need to check elements as they must all be primitives)
    } else if (ArrayBuffer.isView(obj)) {
      let retObj = new Array(obj.length);
      for (let i = 0; i < obj.length; ++i) {
        retObj[i] = obj[i];
      }
      return retObj;

      // object
    } else {
      let retObj = {};

      // typed
      if (typeof obj.constructor == 'function' && obj.constructor.tbjson && obj.constructor.tbjson.definition) {
        let definition = definitions[obj.constructor.name];

        // do a lookup for the parent definitions and flatten into one
        if (!definition) {
          definition = obj.constructor.tbjson.definition;
          for (let parent = obj.constructor; parent = getParent(parent);) {
            if (!parent.tbjson || !parent.tbjson.definition) {
              break;
            }
            definition = Object.assign({}, parent.tbjson.definition, definition);
          }
          definitions[obj.constructor.name] = definition;
        }
        let constructor = obj.constructor;

        // unbuild
        if (constructor.tbjson.unbuild) {
          obj = constructor.tbjson.unbuild(obj);
        }
        for (let key in definition) {
          retObj[key] = serialize(obj[key], definitions);
        }

        // plain
      } else {
        for (let key in obj) {
          retObj[key] = serialize(obj[key], definitions);
        }
      }
      return retObj;
    }
  }

  // primitive
  return obj;
}

/**
 * Check a prototype instance (or plain object with specified proto) for invalid fields using the TBJSON definition when available.
 * Return a nested object mirroring the source object with errors.
 * 
 * @param { object } obj - object to check
 * @param { function } prototype - prototype to to treat object as
 * @param { object } options - options
 */
function validate(obj, prototype = null, options = {}, definitions = {}, errorCount = 0) {
  let walkObj;
  let walkProto;

  // validate type
  if (typeof prototype == 'number') {
    if (!validTypedValue(obj, prototype, options)) {
      return [prototype, errorCount + 1];
    }

    // compound or recursive check
  } else {
    let isArray = Array.isArray(prototype);
    let isArrayTypeDef = Array.isArray(prototype) && prototype.length == 2;

    // array
    if (isArray && (Array.isArray(obj) || isTypedArray(obj))) {
      // typed array
      if (isArrayTypeDef && (prototype[0] == ARRAY || prototype[1] == TYPED_ARRAY)) {
        walkObj = obj;
        walkProto = prototype[1];

        // unknown array
      } else {
        walkObj = prototype;
      }

      // qualified type
    } else if (isArrayTypeDef) {
      switch (prototype[0]) {
        // uniform value object
        case OBJECT:
          // cannot be null
          if (typeof obj == 'object' && obj) {
            walkObj = obj;
            walkProto = prototype[1];

            // a null object must be marked nullable
          } else {
            errors = OBJECT;
            errorCount++;
          }
          break;

        // nullable object
        case NULLABLE:
          // ignore if null
          if (obj != null) {
            // ignore nullable nan
            if (!(options.allowNullableNaN && typeof prototype[1] == 'number' && prototype[1] >= UINT8 && prototype[1] <= FLOAT64 && Number.isNaN(obj))) {
              return validate(obj, prototype[1], options, definitions, errorCount);
            }
          }
          break;

        // instance object
        case INSTANCE:
          return validate(obj, prototype[1], options, definitions, errorCount);
      }

      // object
    } else if (typeof obj == 'object' && obj) {
      let definition;
      if (!prototype) {
        prototype = obj.constructor;
      }

      // prototype is tbjson with a definition
      if (typeof prototype == 'function' && prototype.tbjson) {
        // call the validate function for custom validation
        if (prototype.tbjson.validate) {
          return tbjson.validate(obj, options, errorCount);

          // use the passed prototype
        } else {
          // use map
          if (definitions[prototype.name]) {
            definition = definitions[prototype.name];

            // check for parent
          } else {
            definition = prototype.tbjson.definition;

            // only check for a parent if the definition is an object
            if (typeof definition == 'object') {
              for (let parent = prototype; parent = getParent(parent);) {
                if (!parent.tbjson || !parent.tbjson.definition) {
                  break;
                }
                definition = Object.assign({}, parent.tbjson.definition, definition);
              }
              definitions[prototype.name] = definition;
            }
          }
        }

        // definition object
      } else if (typeof prototype == 'object' && prototype) {
        definition = prototype;

        // pseudo prototype
      } else if (typeof prototype == 'string') {
        definition = definitions[prototype];
      }
      if (definition) {
        walkObj = definition;
        prototype = definition;
      }
    }
  }

  // recurse into the object
  if (walkObj) {
    let errors = {};
    let inputErrorCount = errorCount;
    for (let key in walkObj) {
      let [subErrors, subErrorCount] = validate(obj[key], walkProto || prototype[key], options, definitions, errorCount);
      if (subErrorCount > errorCount) {
        errors[key] = subErrors;
        errorCount = subErrorCount;
      }
      if (options.returnOnNthError && errorCount >= options.returnOnNthError) {
        break;
      }
    }
    return [errorCount > inputErrorCount ? errors : null, errorCount];

    // no errors
  } else {
    return [null, 0];
  }
}

/* internal */

/**
 * Return true if the value passed is a typed array.
 * 
 * @param { * } val - val to check
 */
function isTypedArray(val) {
  if (typeof val == 'object' && val) {
    return val instanceof Uint8Array || val instanceof Int8Array || val instanceof Uint16Array || val instanceof Int16Array || val instanceof Uint32Array || val instanceof Int32Array || val instanceof Float32Array || val instanceof Float64Array;
  } else {
    return false;
  }
}

/**
 * Check if a value conforms to a primitive type.
 * 
 * @param { * } val - value to check
 * @param { number } type - the tbjson primitive type
 * @param { object } options - options
 */
function validTypedValue(val, type, options = {}) {
  switch (type) {
    case NULL:
      return val == null;
    case BOOL:
      return typeof val == 'boolean' || val === 0 || val === 1;
    case INT8:
      return typeof val == 'number' && (Number.isNaN(val) ? !!options.allowNaN : val >= -128 && val <= 127);
    case UINT8:
      return typeof val == 'number' && (Number.isNaN(val) ? !!options.allowNaN : val >= 0 && val <= 255);
    case INT16:
      return typeof val == 'number' && (Number.isNaN(val) ? !!options.allowNaN : val >= -32768 && val <= 32767);
    case UINT16:
      return typeof val == 'number' && (Number.isNaN(val) ? !!options.allowNaN : val >= 0 && val <= 65535);
    case INT32:
      return typeof val == 'number' && (Number.isNaN(val) ? !!options.allowNaN : val >= -2147483648 && val < 2147483647);
    case UINT32:
      return typeof val == 'number' && (Number.isNaN(val) ? !!options.allowNaN : val >= 0 && val <= 4294967295);
    case FLOAT32:
    case FLOAT64:
      return typeof val == 'number' && (!!options.allowNaN || !Number.isNaN(val));
    case STRING:
      return typeof val == 'string' || !!options.allowNullString && val == null;
    case ARRAY:
      return Array.isArray(val);
    case OBJECT:
      return typeof val == 'object' && val != null;
  }
  return true;
}

/**
 * Tbjson
 * 
 * A JS TBJSON serializer and parser.
 */
class Tbjson {
  constructor(types = [], prototypes = [], offsets = {}, options = {}) {
    _defineProperty(this, "version", VERSION);
    // for registered types (primitives)
    _defineProperty(this, "typeRefs", {});
    _defineProperty(this, "types", {});
    // for registered prototypes (classes)
    _defineProperty(this, "protoRefs", {});
    _defineProperty(this, "protos", {});
    // for plain objects that are inside of known prototypers
    _defineProperty(this, "objs", {});
    // for variable definitions
    _defineProperty(this, "variableDefs", {});
    // binary definition tree
    _defineProperty(this, "root", null);
    // counters for converting types and prototypes to an incrementing numeric value
    _defineProperty(this, "nextObjCode", 0);
    _defineProperty(this, "nextTypeCode", TYPE_OFFSET);
    _defineProperty(this, "nextProtoCode", void 0);
    _defineProperty(this, "finalized", false);
    // default offsets
    _defineProperty(this, "offsets", {
      prototype: PROTOTYPE_OFFSET,
      nullablePrototype: NULLABLE_PROTOTYPE_OFFSET,
      array: ARRAY_OFFSET,
      object: OBJECT_OFFSET
    });
    // default options
    _defineProperty(this, "options", {
      bufferSize: DEFAULT_BUFFER_SIZE,
      numEncoding: DEFAULT_NUM_ENCODING,
      strEncoding: DEFAULT_STR_ENCODING,
      xFactor: DEFAULT_X_FACTOR
    });
    this.offsets = {
      ...this.offsets,
      ...offsets
    };
    this.options = {
      ...this.options,
      ...options
    };
    this.nextProtoCode = this.offsets.prototype;
    this.registerTypes(types);
    this.registerPrototypes(prototypes);
  }

  /*-----------------------------------------------------------------------*/
  /* registers */

  /**
   * Register a variable definition so that any prototypes with the same variable definition id are replaced before serializing.
   * 
   * @param { number | string } id - the identifier of this variable definition
   * @param { obj } def - the definition to set to
   */
  registerVariableDef(id, def) {
    // format the definition
    def = def ? this.fmtDef(def) : null;
    if (def == ERROR) {
      throw new Error(`Invalid definition for variable: ${id}`);
    }
    this.variableDefs[id] = def;
  }

  /**
   * Register a pseudo prototype, rather a variable definition that should be treated as if it were a prototype (to support nullable, object, and array).
   * 
   * @param { number | string } id - the identifier of this pseduo prototype
   * @param { obj } def - the definition to set to
   */
  registerPseudoPrototype(id, def) {
    let code = this.protoRefs[id];

    // already registered
    if (code && this.protos[this.protoRefs[id]]) {
      return;
    }

    // format the definition
    def = def ? this.fmtDef(def) : null;
    if (def == ERROR) {
      throw new Error(`Invalid definition for variable: ${id}`);
    }

    // set the code if not already set
    if (!code) {
      code = this.nextProtoCode++;
      this.protoRefs[id] = code;
    }
    this.protos[code] = new Prototype(def);
  }

  /**
   * Register a prototype / class or plain objecct for serilization and deserialization.
   * If using Class.tbjson = { ... } you must call this for each class, and then call finalizePrototypes for inheritance to work.
   * 
   * Example:
   *
   * Tbjson.registerPrototype(Point); // point must have tbjson set on it: Point.tbjson = { definition: ... } 
   * 
   * Tbjson.registerPrototype({
   *     prototype: Point1,
   *     definition: {
   *         x: Tbjson.TYPES.FLOAT32,
   *         y: Tbjson.TYPES.FLOAT32
   *     },
   *     reference: 'Point',
   *     parentReference: Point0
   * });
   * 
   * Tbjson.registerPrototype({
   *     reference: Point,
   *     definition: {
   *         x: Tbjson.TYPES.FLOAT32,
   *         y: Tbjson.TYPES.FLOAT32
   * });
   * 
   * @param { function | object } prototype - class / prototype constructor or a plain object that represents one
   */
  registerPrototype(prototype) {
    // check if finalized
    if (this.finalized) {
      if (typeof prototype == 'function' && prototype.tbjson) {
        return this.protoRefs[prototype.name];
      }
      return;
    }

    // a prototype
    if (typeof prototype == 'function') {
      // check if it's a known tbjson prototype
      if (prototype.tbjson) {
        // TODO: REMOVE THIS
        if (!prototype.tbjson.definition) {
          throw new Error(`Missing definition for "${prototype.name}"`);
        }
        prototype = {
          prototype: prototype,
          ...prototype.tbjson
        };
      } else {
        prototype = {
          prototype
        };
      }
    }

    // if the ref is not set, use the name
    if (!prototype.reference) {
      prototype.reference = prototype.prototype.name;
    }
    let code = this.protoRefs[prototype.reference];

    // assign a new reference and definition
    if (!code) {
      code = this.nextProtoCode++;
      this.protoRefs[prototype.reference] = code;
    }

    // this code has not been defined
    if (!this.protos[code] || !this.protos[code].definition) {
      let parentCode;

      // get the parent code
      if (prototype.definition) {
        let parent = !prototype.noInherit && prototype.parentReference ? prototype.parentReference : getParent(prototype.prototype);
        parentCode = parent ? this.registerPrototype(parent) : null;
      }

      // format the definition
      let definition = prototype.definition ? this.fmtDef(prototype.definition) : null;
      if (definition == ERROR) {
        throw new Error(`Invalid definition for: ${prototype.prototype.name}`);
      }

      // set the prototype
      this.protos[code] = new Prototype(definition, prototype.prototype, parentCode, prototype.noInherit);
    }
    return code;
  }

  /**
   * Register an array of prototypes.
   * 
   * Example:
   * 
   * [{
   *     constructor: Point,
   *     definition: {
   *         x: Tbjson.TYPES.FLOAT32,
   *         y: Tbjson.TYPES.FLOAT32,
   *         z: Tbjson.TYPES.FLOAT32
   *     }
   * }, {
   *     constructor: Line,
   *     reference: 'Line2',
   *     parentReference: 'Line1',
   *     noInherit: true,
   *     definition: {
   *         point1: 'Point',
   *         point2: 'Point'
   *     }
   * }]
   * 
   * @param { []object } prototypes - array of prototypes 
   */
  registerPrototypes(prototypes = []) {
    for (let prototype of prototypes) {
      this.registerPrototype(prototype);
    }
  }

  /**
   * Register a type.
   * 
   * Example:
   * 
   * {
   *     ref: 'Float48',
   *     serialize: (buffer, data) => { ... },
   *     deserialize: (buffer) => { ... }
   * }
   * 
   * @param { object } type - type to add
   */
  registerType(type) {
    let code = this.typeRefs[type.ref];
    if (!code) {
      code = this.nextTypeCode++;
      this.typeRefs[type.ref] = code;
      this.types[code] = type;
    }
    return code;
  }

  /**
   * Register types.
   * 
   * Example:
   * 
   * [{
   *     ref: 'Float48',
   *     serializer: function(buffer, data) { ... },
   *     deserializer: function(buffer) { ... }
   * }]
   * 
   * @param { []object } types - array of types to register 
   */
  registerTypes(types = []) {
    for (let type of types) {
      this.registerType(type);
    }
  }

  /**
   * If using inheritance, this must be called before serialization to update definitions.
   */
  finalizePrototypes() {
    let finalizedProtos = {};
    while (Object.keys(finalizedProtos).length < Object.keys(this.protos).length) {
      for (let code in this.protos) {
        // don't run on finalized prototypes
        if (finalizedProtos[code]) {
          continue;
        }
        let prototype = this.protos[code];

        // finalize if there is no parent code or if the prototype is set to not inherit
        if (!prototype.parentCode || prototype.noInherit) {
          finalizedProtos[code] = true;
          continue;
        }

        // throw an error if a parent code is missing
        if (!this.protos[prototype.parentCode]) {
          throw new Error('Missing a parent prototype or definition');
        }

        // parent is finalized, so this can be to
        if (finalizedProtos[prototype.parentCode]) {
          // if the definition isn't an object, just use it and ignore any parent definitions
          if (typeof prototype.definition == 'object') {
            prototype.definition = Object.assign({}, this.protos[prototype.parentCode].definition, prototype.definition);
          }
          finalizedProtos[code] = true;
        }
      }
    }
    this.finalized = true;
  }

  /*-----------------------------------------------------------------------*/
  /* serializers */

  /**
   * Serialize the obj to a buffer.  Fastest, but uses the most memory.
   * 
   * @param { object } obj - object to serialize 
   */
  serializeToBuffer(obj) {
    try {
      this.processVariableDefs();

      // make a writer
      this.writer = new BufferWriter(this.options.bufferSize, this.options.xFactor, this.options.strEncoding);

      // process the obj
      this.root = this.serialize(obj);

      // add the header to the front
      return Buffer.concat([this.getHeaderAsBuffer(), this.writer.getBuffer()]);
    } catch (e) {
      e.message = 'Tbjson failed to serialize to the buffer: ' + e.message;
      throw e;
    }
  }

  /**
   * Serialize the object to the stream.  Slower, but uses the least memory.
   * 
   * @param { stream } stream - stream to serialize to
   * @param { object } obj - object to serialize 
   */
  serializeToStream(stream, obj) {
    try {
      this.processVariableDefs();

      // make a writer
      this.writer = new StreamBufferWriter(stream, this.options.bufferSize, this.options.xFactor, this.options.strEncoding);

      // process the obj
      this.root = this.serialize(obj);

      // flush and cleanup
      this.writer.flush();
      this.writer = null;
    } catch (e) {
      e.message = 'Tbjson failed to serialize to the stream: ' + e.message;
      throw e;
    }
  }

  /**
   * Serialize the object to a file. Opens as a write stream, so it's slower and uses less memory.
   * 
   * @param { string } filename - filename / path to write to
   * @param { object } obj - object to serialize
   */
  serializeToFile(filename, obj) {
    return new Promise((res, rej) => {
      try {
        this.processVariableDefs();
        let tempFilename = `${filename}.tmp`;

        // write the data to a tmp file
        let writeStream = fs.createWriteStream(tempFilename, 'binary');
        this.serializeToStream(writeStream, obj);
        writeStream.end();

        // write the final file
        writeStream = fs.createWriteStream(filename, 'binary');

        // write the header
        writeStream.write(this.getHeaderAsBuffer());

        // pipe the tmp file to the final file
        let readStream = fs.createReadStream(tempFilename, 'binary');
        readStream.pipe(writeStream);
        readStream.on('end', () => {
          // cleanup
          fs.unlinkSync(tempFilename);
          res();
        });
      } catch (e) {
        e.message = `Tbjson Failed to serialize object to "${filename}": ` + e.message;
        rej(e);
      }
    });
  }

  /*-----------------------------------------------------------------------*/
  /* parsers */

  /**
   * Parse a TBJSON containing buffer into ab object. Fastest, but uses the most memory.
   * 
   * @param { buffer } buffer - buffer to read from
   * @param { array } selector - anarray that indicates the selected object path
   */
  parseBuffer(buffer, selector = null) {
    try {
      if (!buffer) {
        throw new Error('Null buffer passed in');
      }
      this.reader = new BufferReader(buffer, this.options.strEncoding);

      // validate the buffer type
      if (this.reader.readFixedLengthString(SIZE_MAGIC_NUMBER) != MAGIC_NUMBER) {
        throw new Error('Buffer is not a Typed Binary JSON format');
      }

      // get the header length
      let headerLength = this.reader.read(UINT32);

      // read and parse the header
      this.parseHeader(this.reader.readFixedLengthString(headerLength));

      // construct the object
      if (selector) {
        return this.parseAtSelection(this.root, selector);
      } else {
        return this.parse(this.root);
      }
    } catch (e) {
      e.message = 'Tbjson failed to parse the buffer: ' + e.message;
      throw e;
    }
  }

  /**
   * TODO
   * Parse a TBJSON containing stream into an object. Slower, but uses the least memory.
   * 
   * @param { stream } stream - stream to read from
   * @param { array } selector - anarray that indicates the selected object path
   */
  parseStream(stream, selector = null) {
    return new Promise(async (res, rej) => {
      this.reader = new StreamBufferReader(stream);

      // validate the stream type
      if ((await this.reader.readFixedLengthString(SIZE_MAGIC_NUMBER)) != MAGIC_NUMBER) {
        rej(new Error('Stream is not a Typed Binary JSON format'));
      }

      // get the header length
      let headerLength = await this.reader.read(UINT32);

      // read and parse the header
      this.parseHeader(await this.reader.readFixedLengthString(headerLength));

      // construct the object
      if (selector) {
        res(await this.parseAtSelection(this.root, selector));
      } else {
        res(await this.parse(this.root));
      }
    });
  }

  /**
   * Parse a TBJSON file into the object it represents. Faster, but uses more memory.
   * 
   * @param { string } filename - filename / path to read from
   * @param { array } selector - anarray that indicates the selected object path
   */
  parseFileAsBuffer(filename, selector = null) {
    try {
      return this.parseBuffer(fs.readFileSync(filename), selector);
    } catch (e) {
      e.message = `Tbjson failed to parse "${filename}": ` + e.message;
      throw e;
    }
  }

  /**
   * Parse a TBJSON file into the object it represents. Slower, but uses less memory.
   * 
   * @param { string } filename - filename / path to read from
   * @param { array } selector - anarray that indicates the selected object path
   */
  async parseFileAsStream(filename, selector = null) {
    try {
      return await this.parseStream(fs.createReadStream(filename), selector);
    } catch (e) {
      e.message = `Tbjson failed to parse "${filename}": ` + e.message;
      throw e;
    }
  }

  /*-----------------------------------------------------------------------*/
  /* helpers */

  /**
   * Get the header object after serialization.
   * Useful if you are writing your custom own stream.
   */
  getHeader() {
    // get the type serializers / deserializers
    let typeSizes = {};
    for (let code in this.types) {
      typeSizes[code] = this.types[code].size;
    }

    // get the prototype definitions
    let protoDefs = {};
    for (let code in this.protos) {
      protoDefs[code] = this.protos[code].definition ? this.protos[code].definition : null;
    }
    return {
      version: VERSION,
      offsets: this.offsets,
      typeRefs: this.typeRefs,
      typeSizes: typeSizes,
      protoRefs: this.protoRefs,
      protoDefs: protoDefs,
      objs: this.objs,
      root: this.root
    };
  }

  /**
   * Get the header object as a buffer.
   * Useful if you are writing your custom format.
   */
  getHeaderAsBuffer() {
    try {
      // header string
      let headerStr = JSON.stringify(this.getHeader());

      // make a new buffer, add the header, append the binary
      let buffer = new BufferWriter(SIZE_MAGIC_NUMBER + SIZE_UINT32 + headerStr.length);

      // str - magic number
      buffer.writeFixedLengthString(MAGIC_NUMBER);

      // uint32 - header length
      buffer.write(UINT32, Buffer.byteLength(headerStr, this.strEncoding));

      // str - header
      buffer.writeFixedLengthString(headerStr);
      return buffer.getBuffer();
    } catch (e) {
      e.message = 'Tbjson failed to create a buffer for the header: ' + e.message;
      throw e;
    }
  }

  /**
   * Parse a TBJSON header from a string.
   * Useful if you are writing your own deserializer.
   * 
   * @param { string } headerStr - string containing the encoded JSON header 
   */
  parseHeader(headerStr) {
    try {
      let header = JSON.parse(headerStr);
      this.version = header.version || 0;

      // types
      this.typeRefs = header.typeRefs;
      for (let code in header.typeSizes) {
        if (this.types[code]) {
          this.types[code].size = header.typeSizes[code];
        } else {
          this.types[code] = new Type(undefined, header.typeSizes[code]);
        }
      }

      // prototypes (preserve proto constructors for typed parsing)
      this.protoRefs = header.protoRefs;
      for (let code in header.protoDefs) {
        if (this.protos[code]) {
          this.protos[code].definition = header.protoDefs[code];
        } else {
          this.protos[code] = new Prototype(header.protoDefs[code]);
        }
      }

      // unknown objects
      this.objs = header.objs;

      // set the root
      this.root = header.root;

      // offsets
      if (header.offsets) {
        this.offsets = header.offsets;

        // legacy file, use old offsets
      } else {
        this.offsets = {
          prototype: PROTOTYPE_OFFSET,
          nullablePrototype: L_NULLABLE_PROTOTYPE_OFFSET,
          array: L_ARRAY_OFFSET,
          object: L_OBJECT_OFFSET
        };
      }
    } catch (e) {
      e.message = 'Tbjson failed to parse header string: ' + e.message;
      throw e;
    }
  }

  /*-----------------------------------------------------------------------*/
  /* internal */

  /**
   * Process all prototype definitions and variable definitions.
   */
  processVariableDefs() {
    for (let code in this.protos) {
      if (this.protos[code].definition) {
        this.protos[code].definition = this.replaceVariableDefs(this.protos[code].definition);
      }
    }
  }

  /**
   * Replace a variable definition with the corresponding registered one.
   * 
   * @param { obj } def - the definition to check and replace 
   */
  replaceVariableDefs(def) {
    if (typeof def == 'object') {
      // an array, could be a variable definition
      if (Array.isArray(def)) {
        if (def.length == 2) {
          switch (def[0]) {
            // a variable def
            case VARIABLE_DEF:
              // missing a definition, throw an error
              if (!this.variableDefs[def[1]]) {
                throw new Error(`Unknown variable def: "${def[1]}"`);
              }
              return this.variableDefs[def[1]];

            // another valid tbjson qualifier
            case ARRAY:
            case TYPED_ARRAY:
            case NULLABLE:
            case OBJECT:
              def[1] = this.replaceVariableDefs(def[1]);
              return def;
          }
        }

        // a fixed-length array
        for (let i = 0; i < def.length; ++i) {
          def[i] = this.replaceVariableDefs(def[i]);
        }

        // a definition
      } else {
        for (let key in def) {
          def[key] = this.replaceVariableDefs(def[key]);
        }
      }
    }
    return def;
  }

  /**
   * Format the definition to its number representations.
   * 
   * Converts the more verbose array definitions to simpler numeric ones:
   * 
   * [Tbjson.TYPES.ARRAY, Tbjson.TYPES.FLOAT32] -> ARRAY + FLOAT32 = 12 + 9 = 21
   * [Tbjson.TYPES.Array, Class] ->                ARRAY + NUM_CLASS = 12 + x
   * [Tbjson.TYPES.Array, "class"] ->              ARRAY + NUM_CLASS = 12 + x
   * 
   * @param { object | array | number } def - the definition specifying how to decode the binary data
   */
  fmtDef(def, depth = 0, insideOf = 0) {
    switch (typeof def) {
      // already in number form, just return it
      case 'number':
        return def;

      // string referencing a prototype, add the string to the reference lookup table
      case 'string':
        // type
        if (def[0] == '@') {
          if (!this.typeRefs[def]) {
            this.typeRefs[def] = this.nextTypeCode++;
          }
          return this.typeRefs[def];

          // proto
        } else {
          if (!this.protoRefs[def]) {
            this.protoRefs[def] = this.nextProtoCode++;
          }
          return this.protoRefs[def];
        }

      // prototype (class)
      case 'function':
        return this.registerPrototype(def);

      // object or array
      case 'object':
        // invalid null
        if (!def) {
          break;

          // array
        } else if (Array.isArray(def)) {
          // typed array
          if (def.length == 2 && typeof def[0] == 'number' && def[0] > STRING) {
            // array
            if (def[0] == ARRAY) {
              return this.offsets.array + this.fmtDef(def[1], depth + 1, ARRAY);

              // nullable
            } else if (def[0] == NULLABLE) {
              let subDef = this.fmtDef(def[1], depth + 1, NULLABLE);

              // primitive
              if (subDef < NULLABLE_OFFSET) {
                return NULLABLE_OFFSET + subDef;

                // type or prototype
              } else {
                return this.offsets.nullablePrototype + subDef;
              }

              // primitive typed array
            } else if (def[0] == TYPED_ARRAY) {
              return TYPED_ARRAY_OFFSET + this.fmtDef(def[1], depth + 1, TYPED_ARRAY);

              // object
            } else if (def[0] == OBJECT) {
              return this.offsets.object + this.fmtDef(def[1], depth + 1, OBJECT);

              // variable def
            } else if (def[0] == VARIABLE_DEF) {
              // cannot be nested
              if (depth) {
                throw new Error(`A variable def cannot be nested, try using a pseudo prototype instead: "${def[1]}"`);
              }
              return def;

              // instance object
            } else if (def[0] == INSTANCE) {
              return OBJECT;
            }

            // fixed length array
          } else {
            let fmtDef = new Array(def.length);
            for (let i = 0; i < def.length; ++i) {
              fmtDef[i] = this.fmtDef(def[i], depth + 1);
            }

            // inside of an array or object, register def and return matching code
            if (insideOf == ARRAY || insideOf == OBJECT) {
              let code = this.nextProtoCode++;
              this.protos[code] = new Prototype(fmtDef);
              return code;

              // just return the def
            } else {
              return fmtDef;
            }
          }

          // simple object
        } else {
          let fmtDef = {};
          for (let key in def) {
            fmtDef[key] = this.fmtDef(def[key], depth + 1);
          }
          return fmtDef;
        }
    }

    // must have an invalid definition
    return ERROR;
  }

  /**
   * Serialize the object based on its definition. Only run for known prototypes.
   * 
   * @param { object } obj - the object to serialize
   * @param { object | array | number } def - the definition specifying how to decode the binary data
   * @param { bool } isArray - special case for an unknown def that is an array
   */
  serializeDef(obj, def, isArray) {
    // no def, could be a known but undefined prototype, or a plain object, kick back to the serializer
    if (!def) {
      // write the code
      let code = this.nextObjCode++;
      this.writer.write(UINT16, code);
      let ref;

      // write the array
      if (isArray) {
        ref = new Array(obj.length);
        for (let i = 0; i < obj.length; ++i) {
          ref[i] = this.serialize(obj[i]);
        }

        // write the obj
      } else {
        ref = {};
        for (let key in obj) {
          ref[key] = this.serialize(obj[key]);
        }
      }
      this.objs[code] = ref;
      return;
    }
    switch (typeof def) {
      // typed
      case 'number':
        // primitive or higher-order type
        if (def < NULLABLE_OFFSET) {
          // an unknown object
          if (def == OBJECT) {
            this.serializeDef(obj);

            // an unknown array
          } else if (def == ARRAY) {
            this.serializeDef(obj, null, true);

            // primitive
          } else {
            this.writer.write(def, obj);
          }

          // nullable primitive or higher-order type
        } else if (def < TYPED_ARRAY_OFFSET) {
          if (obj == null) {
            this.writer.write(NULL);
          } else {
            this.writer.write(BOOL, true);
            this.serializeDef(obj, def - NULLABLE_OFFSET);
          }

          // primitive typed array
        } else if (def < TYPE_OFFSET) {
          this.writer.write(UINT32, obj.buffer.byteLength);
          this.writer.writeBuffer(Buffer.from(obj.buffer));

          // type
        } else if (def < this.offsets.prototype) {
          if (!this.types[def] || this.types[def].ref == null) {
            throw new Error('Missing type definition');
          }
          let buffer = this.types[def].serialize(obj);
          if (!this.types[def].size) {
            this.writer.write(UINT16, buffer.length);
          }
          this.writer.writeBuffer(buffer);

          // prototype
        } else if (def < this.offsets.nullablePrototype) {
          if (obj == null || typeof obj != 'object') {
            throw new Error(`Null objects cannot be passed into known prototypes, mark as a nullable known prototype instead: ${this.protos[def] ? this.protos[def].prototype : def}`);
          }

          // known prototype
          if (obj.constructor.tbjson) {
            // register the prototype if needed
            this.registerPrototype(obj.constructor);

            // call the unbuild function for pre serialization 
            if (obj.constructor.tbjson.unbuild) {
              obj = obj.constructor.tbjson.unbuild(obj);
            }
          }
          this.serializeDef(obj, this.protos[def].definition);

          // nullable type or prototype
        } else if (def < this.offsets.array) {
          // null values allowed, mark it as null or not
          if (obj == null) {
            this.writer.write(NULL);
          } else {
            this.writer.write(BOOL, true);
            this.serializeDef(obj, def - this.offsets.nullablePrototype);
          }

          // variable-length fixed typed array 
        } else if (def < this.offsets.object) {
          // if valid, continue
          if (obj && Array.isArray(obj)) {
            // write out the length
            this.writer.write(UINT32, obj.length);
            for (let i = 0; i < obj.length; ++i) {
              this.serializeDef(obj[i], def - this.offsets.array);
            }

            // if not valid, auto-cast into an empty array
          } else {
            this.writer.write(UINT32, 0);
          }

          // uniform object
        } else {
          // if valid, continue
          if (obj && typeof obj == 'object' && !Array.isArray(obj)) {
            // write out the length
            this.writer.write(UINT32, Object.keys(obj).length);

            // write out the keys and values
            for (let key in obj) {
              this.writer.write(STRING, key);
              this.serializeDef(obj[key], def - this.offsets.object);
            }

            // if not valid, auto-cast into an empty object
          } else {
            this.writer.write(UINT32, 0);
          }
        }
        break;

      // oject or array
      case 'object':
        // fixed-length variable type array
        if (Array.isArray(def)) {
          for (let i = 0; i < def.length; ++i) {
            this.serializeDef(obj[i], def[i]);
          }

          // object
        } else {
          for (let key in def) {
            this.serializeDef(obj[key], def[key]);
          }
        }
        break;

      // invalid
      default:
        throw new Error(`Invalid definition: ${def}`);
    }
  }

  /**
   * Serialize an object. Can be known (TBJSON has a definition for it) or plain (Class or object that TBJSON doesn't have a definition for).
   * Calls serializeDef() if a known type is found.
   * 
   * @param { object } obj - the object to serialize
   */
  serialize(obj) {
    switch (typeof obj) {
      // bool
      case 'boolean':
        this.writer.write(BOOL, obj);
        return BOOL;

      // number
      case 'number':
        this.writer.write(FLOAT64, obj);
        return FLOAT64;

      // string
      case 'string':
        this.writer.write(STRING, obj);
        return STRING;

      // null, object, or array
      case 'object':
        // null
        if (!obj) {
          return NULL;

          // array
        } else if (Array.isArray(obj)) {
          let refs = new Array(obj.length);
          for (let i = 0; i < obj.length; ++i) {
            refs[i] = this.serialize(obj[i]);
          }
          return refs;

          // primitive typed array
        } else if (ArrayBuffer.isView(obj)) {
          let ref = NULL;
          if (obj instanceof Uint8Array) {
            ref = TYPED_ARRAY_OFFSET + UINT8;
          } else if (obj instanceof Int8Array) {
            ref = TYPED_ARRAY_OFFSET + INT8;
          } else if (obj instanceof Uint16Array) {
            ref = TYPED_ARRAY_OFFSET + UINT16;
          } else if (obj instanceof Int16Array) {
            ref = TYPED_ARRAY_OFFSET + INT16;
          } else if (obj instanceof Uint32Array) {
            ref = TYPED_ARRAY_OFFSET + UINT32;
          } else if (obj instanceof Int32Array) {
            ref = TYPED_ARRAY_OFFSET + INT32;
          } else if (obj instanceof Float32Array) {
            ref = TYPED_ARRAY_OFFSET + FLOAT32;
          } else if (obj instanceof Float64Array) {
            ref = TYPED_ARRAY_OFFSET + FLOAT64;
          }
          if (ref) {
            this.writer.write(UINT32, obj.buffer.byteLength);
            this.writer.writeBuffer(Buffer.from(obj.buffer));
          }
          return ref;

          // object or known prototype
        } else {
          // the object is a prototype
          if (obj.constructor) {
            // a known tbjson prototype to be added, or a lookup if not known
            let code = obj.constructor.tbjson ? this.registerPrototype(obj.constructor) : this.protoRefs[obj.constructor.name];
            if (code != null) {
              // unbuild
              if (obj.constructor.tbjson && obj.constructor.tbjson.unbuild) {
                obj = obj.constructor.tbjson.unbuild(obj);
              }

              // process the prototype definition
              this.serializeDef(obj, this.protos[code].definition);
              return code;
            }
          }

          // simple object, traverse accordingly

          let ref = {};
          for (let key in obj) {
            ref[key] = this.serialize(obj[key]);
          }
          return ref;
        }
    }
  }

  /**
   * Parse a definition, but only return the portion that matches the selector.
   * 
   * TODO: IMPLEMENT NULL READER TO SKIP ENTRIES FOR PERFORMANCE
   * 
   * @param { object | array | number } def - the definition specifying how to decode the binary data
   * @param { array } selector - quit early and return the value selected by this
   */
  parseAtSelection(def, selector, path = [], prototype) {
    // forward a plain object
    if (typeof def == 'number' && def == OBJECT) {
      return this.parseAtSelection(this.objs[this.reader.read(UINT16)], selector, path);

      // forward a known prototype
    } else if (typeof def == 'number' && def >= this.offsets.prototype && def < this.offsets.array) {
      let proto = this.protos[def];
      return this.parseAtSelection(proto.definition ? proto.definition : this.objs[this.reader.read(UINT16)], selector, path, proto.prototype);

      // control the object path
    } else if (typeof def == 'object' && !Array.isArray(def)) {
      let selection = selector.shift();
      for (let key in def) {
        if (key == selection) {
          if (!selector.length) {
            return this.parse(def[key], prototype);
          } else {
            return this.parseAtSelection(def[key], selector, path.concat([selection]));
          }
        }
        this.parse(def[key]);
      }

      // read to the void
    } else {
      this.parse(def);
    }
    return null;
  }

  /**
   * Parse a definition.
   * 
   * @param { object | array | number } def - the definition specifying how to decode the binary data
   * @param { function } [prototype] - create this type during object instantiation
   */
  parse(def, prototype) {
    // type
    if (typeof def == 'number') {
      // primitive
      if (def < NULLABLE_OFFSET) {
        // null
        if (def == NULL) {
          return null;

          // unknown object or array
        } else if (def == OBJECT || def == ARRAY) {
          return this.parse(this.objs[this.reader.read(UINT16)]);

          // primitive
        } else {
          return this.reader.read(def);
        }

        // nullable primitive or higher-order type
      } else if (def < TYPED_ARRAY_OFFSET) {
        // non null
        if (this.reader.read(UINT8)) {
          // support older versions
          if (this.version < 1) {
            return this.reader.read(def - NULLABLE_OFFSET);
          } else {
            return this.parse(def - NULLABLE_OFFSET);
          }

          // null
        } else {
          return null;
        }

        // primitive typed array
      } else if (def < TYPE_OFFSET) {
        return this.reader.readTypedArray(def - TYPED_ARRAY_OFFSET, this.reader.read(UINT32));

        // type
      } else if (def < this.offsets.prototype) {
        let type = this.types[def];
        if (type) {
          let buffer;
          if (type.size) {
            buffer = this.reader.readBuffer(type.size);
          } else {
            let length = this.reader.read(UINT16);
            buffer = this.reader.readBuffer(length);
          }
          if (type.ref) {
            return type.deserialize(buffer);
          } else {
            return buffer.toString('base64');
          }
        }

        // prototype
      } else if (def < this.offsets.nullablePrototype) {
        let proto = this.protos[def];
        return this.parse(proto.definition ? proto.definition : this.objs[this.reader.read(UINT16)], proto.prototype);

        // nullable typed array / type / prototype
      } else if (def < this.offsets.array) {
        // null
        if (!this.reader.read(UINT8)) {
          return null;
        }
        return this.parse(def - this.offsets.nullablePrototype);

        // variable-length fixed typed array 
      } else if (def < this.offsets.object) {
        let length = this.reader.read(UINT32);
        let objs = new Array(length);
        for (let i = 0; i < length; ++i) {
          objs[i] = this.parse(def - this.offsets.array);
        }
        return objs;

        // uniform object
      } else {
        let length = this.reader.read(UINT32);
        let obj = {};
        for (let i = 0; i < length; ++i) {
          obj[this.parse(STRING)] = this.parse(def - this.offsets.object);
        }
        return obj;
      }

      // fixed-length array
    } else if (Array.isArray(def)) {
      let objs = new Array(def.length);
      for (let i = 0; i < def.length; ++i) {
        objs[i] = this.parse(def[i]);
      }
      return objs;

      // object
    } else {
      let obj = prototype ? new prototype() : {};
      for (let key in def) {
        obj[key] = this.parse(def[key]);
      }

      // call the build function for post construction
      if (prototype && prototype.tbjson && prototype.tbjson.build) {
        prototype.tbjson.build(obj);
      }
      return obj;
    }
  }
}

// constant types (primitive and higher order)
Tbjson.TYPES = {
  NULL,
  BOOL,
  INT8,
  UINT8,
  INT16,
  UINT16,
  INT32,
  UINT32,
  FLOAT32,
  FLOAT64,
  STRING,
  ARRAY,
  OBJECT,
  NULLABLE,
  TYPED_ARRAY,
  UNKNOWN,
  VARIABLE_DEF,
  INSTANCE
};

// custom types (user can add more using Type as a base class)
Tbjson.Type = Type;
Tbjson.Types = {
  BigIntType,
  DateType,
  RegexType
};

// functions
Tbjson.cast = cast;
Tbjson.clone = clone;
Tbjson.definition = definition;
Tbjson.flattenValidation = flattenValidation;
Tbjson.serialize = serialize;
Tbjson.validate = validate;

module.exports = Tbjson;
