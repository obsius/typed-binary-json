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
const SIZE_MAGIC_NUMBER = 4; // types

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
const FLOAT64 = 10;
const STRING = 11;
const ARRAY = 12;
const OBJECT = 13;
const CUSTOM = 14; // type sizes
const SIZE_INT8 = 1;
const SIZE_UINT8 = 1;
const SIZE_INT16 = 2;
const SIZE_UINT16 = 2;
const SIZE_INT32 = 4;
const SIZE_UINT32 = 4;
const SIZE_FLOAT32 = 4;
const SIZE_FLOAT64 = 8;
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

  resize() {
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
  /* private */


  checkSize(size) {
    if (this.offset + size > this.size) {
      this.resize();
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
    if (this.offset + size > this.size) {
      if (this.streamReady && !this.flush()) {
        this.resize();
      } else {
        this.resize();
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
  constructor(types = [], options = {}) {
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

    if (types && types.length) {
      this.registerTypes(types);
    }

    this.options = { ...this.options,
      ...options
    };
  }

  registerConstructor(c) {}

  registerType(type) {}

  registerTypes(types) {
    for (let obj of types) {
      this.registerType(obj);
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
      throw new Error('Tbjson failed to create a buffer for the header: ' + e);
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
      throw new Error('Tbjson failed to parse header string: ' + e);
    }
  }

  serializeToBuffer(obj) {
    try {
      // make a writer
      this.writer = new BufferWriter(this.options.bufferSize); // process the obj

      this.root = this.serialize(obj); // add the header to the front

      return Buffer.concat([this.getHeaderAsBuffer(), this.writer.getBuffer()]);
    } catch (e) {
      throw new Error('Tbjson failed to serialize to the buffer: ' + e);
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
      throw new Error('Tbjson failed to serialize to the stream: ' + e);
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
        rej(new Error(`Tbjson Failed to serialize object to "${filename}": ` + e));
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
      throw new Error('Tbjson failed to parse the buffer: ' + e);
    }
  }

  async parseFileAsStream(filename) {
    try {
      return await this.parseStream(fs.createReadStream(filename));
    } catch (e) {
      throw new Error(`Tbjson failed to parse "${filename}": ` + e);
    }
  }

  parseFileAsBuffer(filename) {
    try {
      return this.parseBuffer(fs.readFileSync(filename));
    } catch (e) {
      throw new Error(`Tbjson failed to parse "${filename}": ` + e);
    }
  }
  /* private */


  parse(def) {
    // a type
    if (typeof def == 'number') {
      // primitive
      if (def < TYPE_OFFSET) {
        // non-null
        if (def) {
          return this.reader.read(def); // null
        } else {
          return null;
        } // custom type

      } else if (def < CLASS_OFFSET) {
        return this.reader.read(def); // class
      } else if (def < ARRAY_OFFSET) {
        return this.parse(this.classes[def]); // typed array
      } else {
        let length = this.reader.read(UINT32);
        let objs = [];

        for (let i = 0; i < length; ++i) {
          objs.push(this.parse(def ^ ARRAY_OFFSET));
        }

        return objs;
      } // a fixed-length array

    } else if (Array.isArray(def)) {
      let objs = [];

      for (let i = 0; i < def.length; ++i) {
        objs.push(this.parse(def[i]));
      }

      return objs; // an object
    } else {
      let obj = {};

      for (let key in def) {
        obj[key] = this.parse(def[key]);
      }

      return obj;
    }
  }

  fmtDef(def) {
    switch (typeof def) {
      case 'number':
        return def;

      case 'string':
        if (this.refs[def]) {
          return this.refs[def];
        }

        this.refs[def] = this.nextClassCode++;
        return this.refs[def];

      case 'object':
        if (Array.isArray(def)) {
          if (def.length == 2 && def[0] == ARRAY) {
            return ARRAY_OFFSET + this.fmtDef(def[1]);
          } else {
            let fmtDef = [];

            for (let i = 0; i < def.length; ++i) {
              fmtDef.push(this.fmtDef(def[i]));
            }

            return fmtDef;
          }
        } else {
          let fmtDef = {};

          for (let key in def) {
            fmtDef[key] = this.fmtDef(def[key]);
          }

          return fmtDef;
        }

      case 'number':
      case 'boolean':
        // invalid
        break;
    }
  }

  addClass(obj) {
    let template = obj.constructor.tbjson;
    let code = this.refs[template.ref]; // assign a new reference and definition

    if (!code) {
      code = this.nextClassCode++;
      this.refs[template.ref] = code;
    } // this reference has not been defined, so set the definition


    if (!this.classes[code]) {
      this.classes[code] = this.fmtDef(template.def);
    }

    return code;
  }

  serializeDef(obj, def) {
    // is typed
    if (typeof def == 'number') {
      // is variable-length fixed typed array 
      if (def > ARRAY_OFFSET) {
        this.writer.write(UINT32, obj.length);

        for (let i = 0; i < obj.length; ++i) {
          this.serializeDef(obj[i], def ^ ARRAY_OFFSET);
        } // class object

      } else if (def > CLASS_OFFSET) {
        this.addClass(obj);
        this.serializeDef(obj, this.classes[def]); // is primitive
      } else {
        this.writer.write(def, obj);
      } // is a sub object or array

    } else {
      // is fixed-length variable type array
      if (Array.isArray(def)) {
        for (let i = 0; i < def.length; ++i) {
          this.serializeDef(obj[i], def[i]);
        } // is a sub object

      } else {
        for (let key in def) {
          this.serializeDef(obj[key], def[key]);
        }
      }
    }
  }

  serialize(obj) {
    switch (typeof obj) {
      case 'boolean':
        this.writer.write(BOOL, obj);
        return BOOL;

      case 'number':
        this.writer.write(FLOAT32, obj);
        return FLOAT32;

      case 'string':
        this.writer.write(STRING, obj);
        return STRING;

      case 'object':
        if (obj == null) {
          return NULL;
        } else if (Array.isArray(obj)) {
          let refs = [];

          for (let i = 0; i < obj.length; ++i) {
            refs.push(this.serialize(obj[i]));
          }

          return refs;
        } else {
          // the object is a known tbjson class
          if (obj.constructor && obj.constructor.tbjson) {
            // add this object type to the known classes
            let code = this.addClass(obj); // process the class

            this.serializeDef(obj, this.classes[code]);
            return code;
          }

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
  OBJECT,
  CUSTOM
};

module.exports = Tbjson;
