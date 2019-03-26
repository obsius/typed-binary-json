import fs from 'fs';

import {
	MAGIC_NUMBER,
	SIZE_MAGIC_NUMBER,
	
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
	OBJECT,
	CUSTOM,

	SIZE_UINT32,
	
	TYPE_OFFSET,
	CLASS_OFFSET,
	ARRAY_OFFSET
} from './constants';

import BufferWriter from './BufferWriter';
import BufferReader from './BufferReader';
import StreamBufferWriter from './StreamBufferWriter';
import StreamBufferReader from './StreamBufferReader';

const DEFAULT_STR_ENCODING = 'utf-8';
const DEFAULT_NUM_ENCODING = FLOAT64;
const DEFAULT_BUFFER_SIZE = 1048576;

/**
 * Tbjson
 */
export default class Tbjson {
	
	refs = {};
	classes = {};
	types = {};
	root = null;

	nextTypeCode = TYPE_OFFSET;
	nextClassCode = CLASS_OFFSET;

	options = {
		encStringAs: DEFAULT_STR_ENCODING,
		encNumberAs: DEFAULT_NUM_ENCODING,
		bufferSize: DEFAULT_BUFFER_SIZE
	};
	
	constructor(types = [], options = {}) {
		
		if (types && types.length) {
			this.registerTypes(types);
		}
		
		this.options = {
			...this.options,
			...options
		};
	}

	registerConstructor(c) {

	}
	
	registerType(type) {
		
	}
	
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
			let headerStr = JSON.stringify(this.getHeader());

			// make a new buffer, add the header, append the binary
			let buffer = new BufferWriter(SIZE_MAGIC_NUMBER + SIZE_UINT32 + headerStr.length);

			// str - magic number
			buffer.writeFixedLengthString(MAGIC_NUMBER);

			// uint32 - header length
			buffer.write(UINT32, headerStr.length);

			// str - header
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
			this.writer = new BufferWriter(this.options.bufferSize);

			// process the obj
			this.root = this.serialize(obj);

			// add the header to the front
			return Buffer.concat([this.getHeaderAsBuffer(), this.writer.getBuffer()]);

		} catch(e) {
			throw new Error('Tbjson failed to serialize to the buffer: ' + e);
		}
	}
	
	serializeToStream(stream, obj) {
		try {

			// make a writer
			this.writer = new StreamBufferWriter(stream, this.options.bufferSize);

			// process the obj
			this.root = this.serialize(obj);
			
			// flush and cleanup
			this.writer.flush();
			this.writer = null;
		} catch (e) {
			throw new Error('Tbjson failed to serialize to the stream: ' + e);
		}
	}

	serializeToFile(filename, obj) {
		return new Promise((res, rej) => {
			try {

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
				rej(new Error(`Tbjson Failed to serialize object to "${filename}": ` + e));
			}
		});
	}
	
	// TODO: doesn't work
	parseStream(stream) {
		return new Promise(async (res, rej) => {

			this.reader = new StreamBufferReader(stream);

			// validate the stream type
			if (await this.reader.read(STRING, SIZE_MAGIC_NUMBER) != MAGIC_NUMBER) {
				rej(new Error('Stream is not a Typed Binary JSON format'));
			}

			// get the header length
			let headerLength = await this.reader.read(UINT32);

			// read and parse the header
			this.parseHeader(await this.reader.read(STRING, headerLength));

			// construct the object
			res(await this.parse(this.root));
		});
	}

	parseBuffer(buffer) {
		try {

			this.reader = new BufferReader(buffer);

			// validate the buffer type
			if (this.reader.read(STRING, SIZE_MAGIC_NUMBER) != MAGIC_NUMBER) {
				throw new Error('Buffer is not a Typed Binary JSON format');
			}

			// get the header length
			let headerLength = this.reader.read(UINT32);

			// read and parse the header
			this.parseHeader(this.reader.read(STRING, headerLength));

			// construct the object
			return this.parse(this.root);

		} catch(e) {
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
					return this.reader.read(def);
				// null
				} else {
					return null;
				}

			// custom type
			} else if (def < CLASS_OFFSET) {
				return this.reader.read(def);

			// class
			} else if (def < ARRAY_OFFSET) {
				return this.parse(this.classes[def]);

			// typed array
			} else {

				let length = this.reader.read(UINT32);
				let objs = [];

				for (let i = 0; i < length; ++i) {
					objs.push(this.parse(def ^ ARRAY_OFFSET));
				}
				return objs;
			}

		// a fixed-length array
		} else if (Array.isArray(def)) {
			let objs = [];
			for (let i = 0; i < def.length; ++i) {
				objs.push(this.parse(def[i]));
			}
			return objs;

		// an object
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
				if (this.refs[def]) { return this.refs[def]; }
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
		let code = this.refs[template.ref];

		// assign a new reference and definition
		if (!code) {
			code = this.nextClassCode++;
			this.refs[template.ref] = code;
		}

		// this reference has not been defined, so set the definition
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
				}

			// class object
			} else if (def > CLASS_OFFSET) {
				this.addClass(obj);
				this.serializeDef(obj, this.classes[def]);

			// is primitive
			} else {
				this.writer.write(def, obj);
			}

		// is a sub object or array
		} else {

			// is fixed-length variable type array
			if (Array.isArray(def)) {
				for (let i = 0; i < def.length; ++i) {
					this.serializeDef(obj[i], def[i]);
				}

			// is a sub object
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
						let code = this.addClass(obj);

						// process the class
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

Tbjson.TYPES = { BYTE, BOOL, INT8, UINT8, INT16, UINT16, INT32, UINT32, FLOAT32, FLOAT64, STRING, ARRAY, OBJECT, CUSTOM };