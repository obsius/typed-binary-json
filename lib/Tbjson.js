'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = _interopDefault(require('fs'));

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

// magic number for file type
const MAGIC_NUMBER = '.tbj';
const SIZE_MAGIC_NUMBER = 4; // primitive types

const NULL = 0;
const BYTE = 1;
const BOOL = 2;
const UINT8 = 3;
const INT8 = 4;
const UINT16 = 5;
const INT16 = 6;
const UINT32 = 7;
const INT32 = 8;
const FLOAT32 = 9;
const FLOAT64 = 10; // higher-order types

const STRING = 11;
const ARRAY = 12;
const TYPED_ARRAY = 13; // primitive sizes
const SIZE_INT8 = 1;
const SIZE_UINT8 = 1;
const SIZE_INT16 = 2;
const SIZE_UINT16 = 2;
const SIZE_INT32 = 4;
const SIZE_UINT32 = 4;
const SIZE_FLOAT32 = 4;
const SIZE_FLOAT64 = 8; // offsets

const TYPED_ARRAY_OFFSET = 16;
const TYPE_OFFSET = 32;
const CLASS_OFFSET = 64;
const ARRAY_OFFSET = 512;

const DEFAULT_BUFFER_SIZE = 16384;
const DEFAULT_X_FACTOR = 2;
const DEFAULT_STR_ENCODING = 'utf-8';
class BufferWriter {
  constructor(size = DEFAULT_BUFFER_SIZE, xFactor = DEFAULT_X_FACTOR, strEncoding = DEFAULT_STR_ENCODING) {
    _defineProperty(this, "offset", 0);

    this.buffer = Buffer.allocUnsafe(size);
    this.xFactor = xFactor;
    this.strEncoding = strEncoding;
  }

  get size() {
    return this.buffer.length;
  }

  getBuffer() {
    return this.buffer.slice(0, this.offset);
  }

  grow() {
    this.buffer = Buffer.concat([this.buffer, Buffer.allocUnsafe(this.size * Math.floor(this.xFactor / 2))]);
  }

  writeFixedLengthString(val) {
    this.buffer.write(val, this.offset, val.length, this.strEncoding);
    this.offset += val.length;
  }

  write(type, val) {
    switch (type) {
      case NULL:
        val = 0;

      case BYTE:
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
        this.buffer.writeUInt16LE(val, this.offset);
        this.offset += SIZE_UINT16;
        break;

      case INT16:
        this.checkSize(SIZE_INT16);
        this.buffer.writeInt16LE(val, this.offset);
        this.offset += SIZE_INT16;
        break;

      case UINT32:
        this.checkSize(SIZE_UINT32);
        this.buffer.writeUInt32LE(val, this.offset);
        this.offset += SIZE_UINT32;
        break;

      case INT32:
        this.checkSize(SIZE_INT32);
        this.buffer.writeInt32LE(val, this.offset);
        this.offset += SIZE_INT32;
        break;

      case FLOAT32:
        this.checkSize(SIZE_FLOAT32);
        this.buffer.writeFloatLE(val, this.offset);
        this.offset += SIZE_FLOAT32;
        break;

      case FLOAT64:
        this.checkSize(SIZE_FLOAT64);
        this.buffer.writeDoubleLE(val, this.offset);
        this.offset += SIZE_FLOAT64;
        break;

      case STRING:
        this.checkSize(val.length + SIZE_UINT8);
        this.buffer.write(val, this.offset, val.length, this.strEncoding);
        this.offset += val.length;
        this.buffer.writeUInt8(0, this.offset);
        this.offset += SIZE_UINT8;
    }
  }

  writeBuffer(buffer) {
    this.checkSize(buffer.length);
    buffer.copy(this.buffer, this.offset);
    this.offset += buffer.length;
  }
  /* private */


  checkSize(size) {
    while (this.offset + size > this.size) {
      this.grow();
    }
  }

}

class BufferReader {
  constructor(buffer) {
    _defineProperty(this, "offset", 0);

    this.buffer = buffer;
  }

  read(type, length = 0) {
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
        data = this.buffer.readUInt16LE(this.offset);
        this.offset += SIZE_UINT16;
        break;

      case INT16:
        data = this.buffer.readInt16LE(this.offset);
        this.offset += SIZE_INT16;
        break;

      case UINT32:
        data = this.buffer.readUInt32LE(this.offset);
        this.offset += SIZE_UINT32;
        break;

      case INT32:
        data = this.buffer.readInt32LE(this.offset);
        this.offset += SIZE_INT32;
        break;

      case FLOAT32:
        data = this.buffer.readFloatLE(this.offset);
        this.offset += SIZE_FLOAT32;
        break;

      case FLOAT64:
        data = this.buffer.readDoubleLE(this.offset);
        this.offset += SIZE_FLOAT64;
        break;

      case STRING:
        if (length) {
          data = this.buffer.toString('utf-8', this.offset, this.offset + length);
          this.offset += length;
        } else {
          length = this.nextNullAt();
          data = this.buffer.toString('utf-8', this.offset, length);
          this.offset = length + 1;
        }

        break;
    }

    return data;
  }

  readTypedArray(type, length) {
    let buffer = this.buffer.buffer.slice(this.offset, this.offset + length);
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
  /* private */


  nextNullAt() {
    for (let i = this.offset; i < this.buffer.length; ++i) {
      if (!this.buffer[i]) {
        return i;
      }
    }

    throw new Error('BufferReader could not find a null value');
  }

}

class StreamBufferWriter extends BufferWriter {
  constructor(stream, size, xFactor, strEncoding) {
    super(size, xFactor, strEncoding);

    _defineProperty(this, "streamIndex", 0);

    _defineProperty(this, "streamReady", true);

    this.stream = stream;
  }
  /* private */


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
    while (this.offset + size > this.size) {
      if (this.streamReady && !this.flush()) {
        this.grow();
      } else {
        this.grow();
      }
    }
  }

}

class StreamBufferReader {
  constructor(stream, size = 8388608) {
    this.stream = stream;
    this.size = size;
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
          this.readBytes(length, readOffset => fn(this.buffer.toString('utf-8', readOffset, length)));
        } else {
          this.readUntilNull();
        }

    }
  }
  /* private */


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

const DEFAULT_STR_ENCODING$1 = 'utf-8';
const DEFAULT_NUM_ENCODING = FLOAT64;
const DEFAULT_BUFFER_SIZE$1 = 1048576;
/**
 * Tbjson
 */

class Tbjson {
  constructor(classes = {}, types = {}, options = {}) {
    _defineProperty(this, "refs", {});

    _defineProperty(this, "classes", {});

    _defineProperty(this, "types", {});

    _defineProperty(this, "root", null);

    _defineProperty(this, "nextTypeCode", TYPE_OFFSET);

    _defineProperty(this, "nextClassCode", CLASS_OFFSET);

    _defineProperty(this, "options", {
      encStringAs: DEFAULT_STR_ENCODING$1,
      encNumberAs: DEFAULT_NUM_ENCODING,
      bufferSize: DEFAULT_BUFFER_SIZE$1
    });

    this.registerClasses(classes);
    this.registerTypes(types);
    this.options = { ...this.options,
      ...options
    };
  }
  /*
  	getClassRefs(obj, refs = []) {
  		if (obj.constructor) {
  			refs.push(obj.constructor.name);
  
  		}
  	}
  
  	registerClass2() {
  		let code = w
  	}
  */


  registerClass(ref, def) {
    let code = this.refs[ref]; // assign a new reference and definition

    if (!code) {
      code = this.nextClassCode++;
      this.refs[ref] = code;
    } // this reference has not been defined, so set the definition


    if (!this.classes[code]) {
      this.classes[code] = this.fmtDef(def);
    }

    return code;
  }

  registerClasses(classes) {
    for (let ref in classes) {
      this.registerClass(ref, classes[ref]);
    }
  } // TODO


  registerType(type) {}

  registerTypes(types) {
    for (let ref in types) {
      this.registerType(ref, types[ref]);
    }
  }

  getHeader() {
    return {
      refs: this.refs,
      classes: this.classes,
      types: this.types,
      root: this.root
    };
  }

  getHeaderAsBuffer() {
    try {
      // header string
      let headerStr = JSON.stringify(this.getHeader()); // make a new buffer, add the header, append the binary

      let buffer = new BufferWriter(SIZE_MAGIC_NUMBER + SIZE_UINT32 + headerStr.length); // str - magic number

      buffer.writeFixedLengthString(MAGIC_NUMBER); // uint32 - header length

      buffer.write(UINT32, headerStr.length); // str - header

      buffer.writeFixedLengthString(headerStr);
      return buffer.buffer;
    } catch (e) {
      e.message = 'Tbjson failed to create a buffer for the header: ' + e.message;
      throw e;
    }
  }

  parseHeader(headerStr) {
    try {
      let header = JSON.parse(headerStr);
      this.refs = header.refs;
      this.classes = header.classes;
      this.types = header.types;
      this.root = header.root;
    } catch (e) {
      e.message = 'Tbjson failed to parse header string: ' + e.message;
      throw e;
    }
  }

  serializeToBuffer(obj) {
    try {
      // make a writer
      this.writer = new BufferWriter(this.options.bufferSize); // process the obj

      this.root = this.serialize(obj); // add the header to the front

      return Buffer.concat([this.getHeaderAsBuffer(), this.writer.getBuffer()]);
    } catch (e) {
      e.message = 'Tbjson failed to serialize to the buffer: ' + e.message;
      throw e;
    }
  }

  serializeToStream(stream, obj) {
    try {
      // make a writer
      this.writer = new StreamBufferWriter(stream, this.options.bufferSize); // process the obj

      this.root = this.serialize(obj); // flush and cleanup

      this.writer.flush();
      this.writer = null;
    } catch (e) {
      e.message = 'Tbjson failed to serialize to the stream: ' + e.message;
      throw e;
    }
  }

  serializeToFile(filename, obj) {
    return new Promise((res, rej) => {
      try {
        let tempFilename = `${filename}.tmp`; // write the data to a tmp file

        let writeStream = fs.createWriteStream(tempFilename, 'binary');
        this.serializeToStream(writeStream, obj);
        writeStream.end(); // write the final file

        writeStream = fs.createWriteStream(filename, 'binary'); // write the header

        writeStream.write(this.getHeaderAsBuffer()); // pipe the tmp file to the final file

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
  } // TODO: doesn't work


  parseStream(stream) {
    return new Promise(async (res, rej) => {
      this.reader = new StreamBufferReader(stream); // validate the stream type

      if ((await this.reader.read(STRING, SIZE_MAGIC_NUMBER)) != MAGIC_NUMBER) {
        rej(new Error('Stream is not a Typed Binary JSON format'));
      } // get the header length


      let headerLength = await this.reader.read(UINT32); // read and parse the header

      this.parseHeader((await this.reader.read(STRING, headerLength))); // construct the object

      res((await this.parse(this.root)));
    });
  }

  parseBuffer(buffer) {
    try {
      this.reader = new BufferReader(buffer); // validate the buffer type

      if (this.reader.read(STRING, SIZE_MAGIC_NUMBER) != MAGIC_NUMBER) {
        throw new Error('Buffer is not a Typed Binary JSON format');
      } // get the header length


      let headerLength = this.reader.read(UINT32); // read and parse the header

      this.parseHeader(this.reader.read(STRING, headerLength)); // construct the object

      return this.parse(this.root);
    } catch (e) {
      e.message = 'Tbjson failed to parse the buffer: ' + e.message;
      throw e;
    }
  }

  async parseFileAsStream(filename) {
    try {
      return await this.parseStream(fs.createReadStream(filename));
    } catch (e) {
      e.message = `Tbjson failed to parse "${filename}": ` + e.message;
      throw e;
    }
  }

  parseFileAsBuffer(filename) {
    try {
      return this.parseBuffer(fs.readFileSync(filename));
    } catch (e) {
      e.message = `Tbjson failed to parse "${filename}": ` + e.message;
      throw e;
    }
  }
  /* private */

  /**
   * Parse a definition.
   * 
   * @param { Object | Array | number } def - the definition specifying how to decode the binary data  
   */


  parse(def) {
    // type
    if (typeof def == 'number') {
      // primitive
      if (def < TYPED_ARRAY_OFFSET) {
        // non null
        if (def) {
          return this.reader.read(def); // null
        } else {
          return null;
        } // primitive typed array

      } else if (def < TYPE_OFFSET) {
        return this.reader.readTypedArray(def ^ TYPED_ARRAY_OFFSET, this.reader.read(UINT32)); // custom type
      } else if (def < CLASS_OFFSET) {
        return this.reader.read(def); // known class
      } else if (def < ARRAY_OFFSET) {
        return this.parse(this.classes[def]); // variable-length fixed typed array 
      } else {
        let length = this.reader.read(UINT32);
        let objs = [];

        for (let i = 0; i < length; ++i) {
          objs.push(this.parse(def ^ ARRAY_OFFSET));
        }

        return objs;
      } // fixed-length array

    } else if (Array.isArray(def)) {
      let objs = [];

      for (let i = 0; i < def.length; ++i) {
        objs.push(this.parse(def[i]));
      }

      return objs; // object
    } else {
      let obj = {};

      for (let key in def) {
        obj[key] = this.parse(def[key]);
      }

      return obj;
    }
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
   * @param { Object | Array | number } def - the definition specifying how to decode the binary data
   */


  fmtDef(def) {
    switch (typeof def) {
      // already in number form, just return it
      case 'number':
        return def;
      // string referencing a class, add the string to the reference lookup table

      case 'string':
        if (this.refs[def]) {
          return this.refs[def];
        }

        this.refs[def] = this.nextClassCode++;
        return this.refs[def];
      // object or array

      case 'object':
        // array
        if (Array.isArray(def)) {
          // typed array
          if (def.length == 2 && def[0] == ARRAY) {
            return ARRAY_OFFSET + this.fmtDef(def[1]); // primitive typed array
          } else if (def.length == 2 && def[0] == TYPED_ARRAY) {
            return TYPED_ARRAY_OFFSET + this.fmtDef(def[1]); // fixed length array
          } else {
            let fmtDef = [];

            for (let i = 0; i < def.length; ++i) {
              fmtDef.push(this.fmtDef(def[i]));
            }

            return fmtDef;
          } // simple object

        } else {
          let fmtDef = {};

          for (let key in def) {
            fmtDef[key] = this.fmtDef(def[key]);
          }

          return fmtDef;
        }

      // invalid type

      case 'boolean':
        break;
    }
  }
  /**
   * Serialize the object based on its definition. Only run for known classes.
   * 
   * @param { Object } obj - the object to serialize
   * @param { Object | Array | number } def - the definition specifying how to decode the binary data
   */


  serializeDef(obj, def) {
    // typed
    if (typeof def == 'number') {
      // primitive
      if (def < TYPED_ARRAY_OFFSET) {
        this.writer.write(def, obj); // primitive typed array
      } else if (def < TYPE_OFFSET) {
        this.writer.write(UINT32, obj.buffer.byteLength);
        this.writer.writeBuffer(Buffer.from(obj.buffer)); // custom type
      } else if (def < CLASS_OFFSET) ; else if (def < ARRAY_OFFSET) {
        // register the class if needed
        if (obj.constructor.tbjson) {
          this.registerClass(obj.constructor.tbjson.ref, obj.constructor.tbjson.def);
        }

        this.serializeDef(obj, this.classes[def]); //variable-length fixed typed array 
      } else {
        // write out the length
        this.writer.write(UINT32, obj.length);

        for (let i = 0; i < obj.length; ++i) {
          this.serializeDef(obj[i], def ^ ARRAY_OFFSET);
        }
      } // oject or array

    } else {
      // fixed-length variable type array
      if (Array.isArray(def)) {
        for (let i = 0; i < def.length; ++i) {
          this.serializeDef(obj[i], def[i]);
        } // object

      } else {
        for (let key in def) {
          this.serializeDef(obj[key], def[key]);
        }
      }
    }
  }
  /**
   * Serialize an object. Can be known (TBJSON has a definition for it) or plain (Class or object that TBJSON doesn't have a definition for).
   * Calls serializeDef() if a known type is found.
   * 
   * @param {obj} obj - the object to serialize
   */


  serialize(obj) {
    switch (typeof obj) {
      // bool
      case 'boolean':
        this.writer.write(BOOL, obj);
        return BOOL;
      // number, use the default number type

      case 'number':
        this.writer.write(FLOAT32, obj);
        return FLOAT32;
      // string

      case 'string':
        this.writer.write(STRING, obj);
        return STRING;
      // null, object, or array

      case 'object':
        // null
        if (obj == null) {
          return NULL; // array
        } else if (Array.isArray(obj)) {
          let refs = [];

          for (let i = 0; i < obj.length; ++i) {
            refs.push(this.serialize(obj[i]));
          }

          return refs; // primitive typed array
        } else if (ArrayBuffer.isView(obj)) {
          let ref = NULL;

          if (obj instanceof Uint8Array) {
            ref = TYPED_ARRAY_OFFSET + UINT8;
          } else if (obj instanceof Uint8Array) {
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

          return ref; // object or known class
        } else {
          // the object is class
          if (obj.constructor) {
            // a known tbjson class
            if (obj.constructor.tbjson) {
              // add this object type to the known classes
              let code = this.registerClass(obj.constructor.tbjson.ref, obj.constructor.tbjson.def); // process the class

              this.serializeDef(obj, this.classes[code]);
              return code; // might be a known tbjson class
            } else {
              let code = this.refs[obj.constructor.name];

              if (code) {
                // process the class
                this.serializeDef(obj, this.classes[code]);
                return code;
              }
            }
          } // simple object, traverse accordingly


          let ref = {};

          for (let key in obj) {
            ref[key] = this.serialize(obj[key]);
          }

          return ref;
        }

    }
  }

}
Tbjson.TYPES = {
  NULL,
  BYTE,
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
  TYPED_ARRAY
};

module.exports = Tbjson;
