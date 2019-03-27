import fs from 'fs';
import WrapError from './WrapError';

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
	TYPED_ARRAY,

	SIZE_UINT32,
	
	TYPED_ARRAY_OFFSET,
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

let iii = 0;

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
	
	constructor(classes = {}, types = {}, options = {}) {
		
		this.registerClasses(classes);
		this.registerTypes(types);
		
		this.options = {
			...this.options,
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
		let code = this.refs[ref];

		// assign a new reference and definition
		if (!code) {
			code = this.nextClassCode++;
			this.refs[ref] = code;
		}

		// this reference has not been defined, so set the definition
		if (!this.classes[code]) {
			this.classes[code] = this.fmtDef(def);
		}

		return code;
	}

	registerClasses(classes) {
		for (let ref in classes) {
			this.registerClass(ref, classes[ref]);
		}
	}
	
	// TODO
	registerType(type) {
		
	}
	
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
			throw new WrapError(e, 'Tbjson failed to create a buffer for the header');
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
			throw new WrapError(e, 'Tbjson failed to parse header string');
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
			throw new WrapError(e, 'Tbjson failed to serialize to the buffer');
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
			throw new WrapError(e, 'Tbjson failed to serialize to the stream');
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
				rej(new WrapError(e, `Tbjson Failed to serialize object to "${filename}"`));
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
	//	try {

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

		//} catch(e) {
			throw new WrapError(e, 'Tbjson failed to parse the buffer');
		//}
	}

	async parseFileAsStream(filename) {
		try {
			return await this.parseStream(fs.createReadStream(filename));
		} catch (e) {
			throw new WrapError(e, `Tbjson failed to parse "${filename}"`);
		}
	}

	parseFileAsBuffer(filename) {
		try {
			return this.parseBuffer(fs.readFileSync(filename));
		} catch (e) {
			throw new WrapError(e, `Tbjson failed to parse "${filename}"`);
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
					return this.reader.read(def);
				// null
				} else {
					return null;
				}

			// primitive typed array
			} else if (def < TYPE_OFFSET) {
				return this.reader.readTypedArray(def ^ TYPED_ARRAY_OFFSET, this.reader.read(UINT32));

			// custom type
			} else if (def < CLASS_OFFSET) {
				return this.reader.read(def);

			// known class
			} else if (def < ARRAY_OFFSET) {
				return this.parse(this.classes[def]);

			// variable-length fixed typed array 
			} else {

				let length = this.reader.read(UINT32);
				let objs = [];

				for (let i = 0; i < length; ++i) {
					objs.push(this.parse(def ^ ARRAY_OFFSET));
				}
				return objs;
			}

		// fixed-length array
		} else if (Array.isArray(def)) {
			let objs = [];
			for (let i = 0; i < def.length; ++i) {
				objs.push(this.parse(def[i]));
			}
			return objs;

		// object
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
				if (this.refs[def]) { return this.refs[def]; }
				this.refs[def] = this.nextClassCode++;
				return this.refs[def];

			// object or array
			case 'object':

				// array
				if (Array.isArray(def)) {

					// typed array
					if (def.length == 2 && def[0] == ARRAY) {
						return ARRAY_OFFSET + this.fmtDef(def[1]);

					// primitive typed array
					} else if (def.length == 2 && def[0] == TYPED_ARRAY) {
						return TYPED_ARRAY_OFFSET + this.fmtDef(def[1]);

					// fixed length array
					} else {
						let fmtDef = [];

						for (let i = 0; i < def.length; ++i) {
							fmtDef.push(this.fmtDef(def[i]));
						}

						return fmtDef;
					}

				// simple object
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
				this.writer.write(def, obj);

			// primitive typed array
			} else if (def < TYPE_OFFSET) {
				this.writer.write(UINT32, obj.buffer.byteLength)
				this.writer.writeBuffer(Buffer.from(obj.buffer));

			// custom type
			} else if (def < CLASS_OFFSET) {
				//TODO

			// known class
			} else if (def < ARRAY_OFFSET) {

				// register the class if needed
				if (obj.constructor.tbjson) {
					this.registerClass(obj.constructor.tbjson.ref, obj.constructor.tbjson.def);
				}

				this.serializeDef(obj, this.classes[def]);

			//variable-length fixed typed array 
			} else {
				// write out the length
				this.writer.write(UINT32, obj.length);

				for (let i = 0; i < obj.length; ++i) {
					this.serializeDef(obj[i], def ^ ARRAY_OFFSET);
				}
			}
			
		// oject or array
		} else {

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
					return NULL;

				// array
				} else if (Array.isArray(obj)) {
					let refs = [];
					for (let i = 0; i < obj.length; ++i) {
						refs.push(this.serialize(obj[i]));
					}
					return refs;

				// primitive typed array
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

					return ref;

				// object or known class
				} else {

					// the object is class
					if (obj.constructor) {

						// a known tbjson class
						if (obj.constructor.tbjson) {

							// add this object type to the known classes
							let code = this.registerClass(obj.constructor.tbjson.ref, obj.constructor.tbjson.def);

							// process the class
							this.serializeDef(obj, this.classes[code]);

							return code;

						// might be a known tbjson class
						} else {

							let code = this.refs[obj.constructor.name];
							if (code) {

								// process the class
								this.serializeDef(obj, this.classes[code]);

								return code;
							}
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
}

Tbjson.TYPES = { NULL, BYTE, BOOL, INT8, UINT8, INT16, UINT16, INT32, UINT32, FLOAT32, FLOAT64, STRING, ARRAY, TYPED_ARRAY };

/* internal */

/**
 * Get the name and names of a classes parents.
 * 
 * @param {Class} proto - the class to check the hierarchical names of 
 */
function getClassRefs(proto) {

	let refs = [];

	if (proto.name) {
		refs = [proto.name].concat(getClassRefs(Object.getPrototypeOf(proto)));
	}

	return refs;
}