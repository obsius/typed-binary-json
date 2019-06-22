import fs from 'fs';

import {
	MAGIC_NUMBER,
	SIZE_MAGIC_NUMBER,
	
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

	SIZE_UINT32,
	
	NULLABLE_OFFSET,
	TYPED_ARRAY_OFFSET,
	TYPE_OFFSET,
	PROTOTYPE_OFFSET,
	NULLABLE_PROTOTYPE_OFFSET,
	ARRAY_OFFSET
} from './constants';

import Type from './Type';
import Prototype from './Prototype';
import BufferWriter from './BufferWriter';
import BufferReader from './BufferReader';
import StreamBufferWriter from './StreamBufferWriter';
import StreamBufferReader from './StreamBufferReader';

const DEFAULT_STR_ENCODING = 'utf-8';
const DEFAULT_NUM_ENCODING = FLOAT64;
const DEFAULT_BUFFER_SIZE = 1048576;

const ERROR = -1;

/**
 * Tbjson
 * 
 * A JS TBJSON serializer and parser.
 */
export default class Tbjson {

	// TODO: for registered types (primitives)
	typeRefs = {};
	types = {};

	// for registered prototypes (classes)
	protoRefs = {};
	protos = {};

	// for plain objects that are inside of known prototypers
	objs = {};

	// for variable definitions
	variableDefs = {};

	// binary definition tree
	root = null;

	// counters for converting types and prototypes to an incrementing numeric value
	nextTypeCode = TYPE_OFFSET;
	nextProtoCode = PROTOTYPE_OFFSET;
	nextObjCode = 0;

	finalized = false;

	// defaults
	options = {
		encStringAs: DEFAULT_STR_ENCODING,
		encNumberAs: DEFAULT_NUM_ENCODING,
		bufferSize: DEFAULT_BUFFER_SIZE
	};
	
	constructor(types = [], prototypes = [], options = {}) {
		
		this.registerTypes(types);
		this.registerPrototypes(prototypes);
		
		this.options = {
			...this.options,
			...options
		};
	}

	/*-----------------------------------------------------------------------*/
	/* registers */

	/**
	 * Register a variable definition so that any prototypes with the same variable definition id are replaced before serializing.
	 * 
	 * @param { number | string } id - the identifier of this variable definition
	 * @param {obj} def - the definition to set to
	 */
	registerVariableDef(id, def) {
		this.variableDefs[id] = def;
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
				prototype = { prototype };
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
				let parent = (!prototype.noInherit && prototype.parentReference) ? prototype.parentReference : getParent(prototype.prototype);
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
	 * Register a prototype (constructor only) recursively, automatically adding all classes that it references.
	 * 
	 * Example:
	 *
	 * Tbjson.registerPrototypeRecur(Point); // point must have tbjson set on it: Point.tbjson = { definition: ... } 
	 * 
	 * @param {function} prototype - prototype constructor
	 */
	registerPrototypeRecur(prototype) {

		if (typeof prototype != 'function' ||
			!prototype.tbjson || !prototype.tbjson.definition ||
			this.protoRefs[prototype.name]) { 
			
			return;
		}

		this.registerPrototype(prototype);

		for (let key in prototype.definition) {

			let refPrototypes = getPrototypesFromDefinition(prototype.definition[key]);

			for (let ref of refPrototypes) {
				this.registerPrototypeRecur(ref);
			}
		}
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
	 * @param {[]object} prototypes - array of prototypes 
	 */
	registerPrototypes(prototypes = []) {
		for (let prototype of prototypes) {
			this.registerPrototype(prototype);
		}
	}
	
	/**
	 * TODO:
	 * Register a type.
	 * 
	 * Example:
	 * 
	 * tbjson.registerType('Float48', (data, buffer) => {}, (buffer) => obj);
	 * 
	 * @param {object} type - type to add
	 */
	registerType(type) {
		
	}
	
	/**
	 * TODO:
	 * Register types.
	 * 
	 * Example:
	 * 
	 * [{
	 *     ref: 'Float48',
	 *     serializer: function(data, buffer) {
	 *         buffer.writeUint8(...);
	 *     },
	 *     deserializer: function(buffer) {
	 *         let num = buffer.readUint8(...);
	 *         return num;
	 *     }
	 * }]
	 * 
	 * @param {[]object} types - array of types to register 
	 */
	registerTypes(types = []) {
		for (let type of types) {
			this.registerType(ref, type.serializer, type.deserializer);
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
				if (finalizedProtos[code]) { continue; }

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
					prototype.definition = Object.assign({}, this.protos[prototype.parentCode].definition, prototype.definition);
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
	 * @param {object} obj - object to serialize 
	 */
	serializeToBuffer(obj) {
		try {

			this.processVariableDefs();

			// make a writer
			this.writer = new BufferWriter(this.options.bufferSize);

			// process the obj
			this.root = this.serialize(obj);

			// add the header to the front
			return Buffer.concat([this.getHeaderAsBuffer(), this.writer.getBuffer()]);

		} catch(e) {
			e.message = 'Tbjson failed to serialize to the buffer: ' + e.message;
			throw e;
		}
	}
	
	/**
	 * Serialize the object to the stream.  Slower, but uses the least memory.
	 * 
	 * @param {stream} stream - stream to serialize to
	 * @param {object} obj - object to serialize 
	 */
	serializeToStream(stream, obj) {
		try {

			this.processVariableDefs();

			// make a writer
			this.writer = new StreamBufferWriter(stream, this.options.bufferSize);

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
	 * @param {string} filename - filename / path to write to
	 * @param {object} obj - object to serialize
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
	 * @param {buffer} buffer - buffer to read from
	 * @param {array} selector - anarray that indicates the selected object path
	 */
	parseBuffer(buffer, selector = null) {
		try {

			if (!buffer) {
				throw new Error('Null buffer passed in');
			}

			this.reader = new BufferReader(buffer);

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

		} catch(e) {
			e.message = 'Tbjson failed to parse the buffer: ' + e.message;
			throw e;
		}
	}

	/**
	 * TODO:
	 * Parse a TBJSON containing stream into an object. Slower, but uses the least memory.
	 * 
	 * @param {stream} stream - stream to read from
	 * @param {array} selector - anarray that indicates the selected object path
	 */
	parseStream(stream, selector = null) {
		return new Promise(async (res, rej) => {

			this.reader = new StreamBufferReader(stream);

			// validate the stream type
			if (await this.reader.readFixedLengthString(SIZE_MAGIC_NUMBER) != MAGIC_NUMBER) {
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
	 * @param {string} filename - filename / path to read from
	 * @param {array} selector - anarray that indicates the selected object path
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
	 * @param {string} filename - filename / path to read from
	 * @param {array} selector - anarray that indicates the selected object path
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
		let typeDefs = {};
		for (let code in this.types) {
			typeDefs[code] = {
				serializer: type.serializer ? this.types[code].serializer.toString() : null,
				deserializer: type.deserializer ? this.types[code].deserializer.toString() : null
			};
		}

		// get the prototype definitions
		let protoDefs = {};
		for (let code in this.protos) {
			protoDefs[code] = this.protos[code].definition ? this.protos[code].definition : null;
		}

		return {
			typeRefs: this.typeRefs,
			typeDefs: typeDefs,
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
			buffer.write(UINT32, headerStr.length);

			// str - header
			buffer.writeFixedLengthString(headerStr);

			return buffer.buffer;

		} catch (e) {
			e.message = 'Tbjson failed to create a buffer for the header: ' + e.message;
			throw e;
		}
	}

	/**
	 * Parse a TBJSON header from a string.
	 * Useful if you are writing your own deserializer.
	 * 
	 * @param {string} headerStr - string containing the encoded JSON header 
	 */
	parseHeader(headerStr) {
		try {

			let header = JSON.parse(headerStr);

			// types
			this.typeRefs = header.typeRefs;
			this.types = {};
			for (let code in header.typeDefs) {
				this.types[code] = new Type(Function(header.typeDefs[code].serializer), Function(header.typeDefs[code].deserializer));
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

		} catch (e) {
			e.message = 'Tbjson failed to parse header string: ' + e.message;
			throw e;
		}
	}

	/*-----------------------------------------------------------------------*/
	/* private */

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
	 * @param {obj} def - the definition to check and replace 
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
	fmtDef(def) {
		switch (typeof def) {

			// already in number form, just return it
			case 'number':
				return def;		

			// string referencing a prototype, add the string to the reference lookup table
			case 'string':
				if (this.protoRefs[def]) { return this.protoRefs[def]; }
				this.protoRefs[def] = this.nextProtoCode++;
				return this.protoRefs[def];

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
					if (def.length == 2) {
						if (def[0] == ARRAY) {
							return ARRAY_OFFSET + this.fmtDef(def[1]);

						// nullable
						} else if (def[0] == NULLABLE) {

							let subDef = this.fmtDef(def[1]);

							// primitive
							if (subDef < NULLABLE_OFFSET) {
								return NULLABLE_OFFSET + subDef;

							// prototype
							} else {
								return NULLABLE_PROTOTYPE_OFFSET + subDef;
							}

						// primitive typed array
						} else if (def[0] == TYPED_ARRAY) {
							return TYPED_ARRAY_OFFSET + this.fmtDef(def[1]);

						// object
						} else if (def[0] == OBJECT) {
							return this.fmtDef(def[0]);

						// variable
						} else if (def[0] == VARIABLE_DEF) {
							return def;
						}
					}

					// fixed length array
					let fmtDef = [];
					for (let i = 0; i < def.length; ++i) {
						fmtDef.push(this.fmtDef(def[i]));
					}
					return fmtDef;

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

				ref = [];
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

				// primitive
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

				// nullable primitive
				} else if (def < TYPED_ARRAY_OFFSET) {
					if (obj == null) {
						this.writer.write(UINT8, 0);
					} else {
						this.writer.write(UINT8, 1);
						this.writer.write(def - NULLABLE_OFFSET, obj);
					}

				// primitive typed array
				} else if (def < TYPE_OFFSET) {
					this.writer.write(UINT32, obj.buffer.byteLength);
					this.writer.writeBuffer(Buffer.from(obj.buffer));

				// custom type
				} else if (def < PROTOTYPE_OFFSET) {
					//TODO

				// known prototype
				} else if (def < ARRAY_OFFSET) {

					let valid = obj != null && typeof obj == 'object';

					// validate the object
					if (def < NULLABLE_PROTOTYPE_OFFSET) {
						if (!valid) {
							throw new Error(`Null objects cannot be passed into known prototypes, mark as a nullable known prototype instead: ${this.protos[def] ? this.protos[def].prototype : def}`);
						}

					// null values allowed, mark it as null or not
					} else {
						if (valid) {
							def -= NULLABLE_PROTOTYPE_OFFSET;
							this.writer.write(BOOL, true);
						} else {
							this.writer.write(NULL);
							return;
						}
					}
				
					// register the prototype if needed
					if (obj.constructor.tbjson) {
						this.registerPrototype(obj.constructor);
					}

					this.serializeDef(obj, this.protos[def].definition);

				//variable-length fixed typed array 
				} else {
					// write out the length
					this.writer.write(UINT32, obj.length);

					for (let i = 0; i < obj.length; ++i) {
						this.serializeDef(obj[i], def - ARRAY_OFFSET);
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
	 * @param {object} obj - the object to serialize
	 */
	serialize(obj) {
		switch (typeof obj) {

			// bool
			case 'boolean':
				this.writer.write(BOOL, obj);
				return BOOL;

			// number, use the default number type
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

						// a known tbjson prototype
						if (obj.constructor.tbjson) {

							// add this object type to the known prototypes
							let code = this.registerPrototype(obj.constructor);

							if (code != null) {

								// process the prototype definition
								this.serializeDef(obj, this.protos[code].definition);

								return code;
							} else {
								// REMOVE
								console.log('warning: ', code, obj);
							}

						// might be a known tbjson prototype
						} else {

							let code = this.protoRefs[obj.constructor.name];
							if (code) {

								// process the prototype
								this.serializeDef(obj, this.protos[code].definition);

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

	/**
	 * Parse a definition, but only return the portion that matches the selector.
	 * 
	 * TODO: IMPLEMENT NULL READER TO SKIP ENTRIES FOR PERFORMANCE
	 * 
	 * @param { object | array | number } def - the definition specifying how to decode the binary data
	 * @param {array} selector - quit early and return the value selected by this
	 */
	parseAtSelection(def, selector, path = [], prototype) {

		// forward a plain object
		if (typeof def == 'number' && def == OBJECT) {
			return this.parseAtSelection(this.objs[this.reader.read(UINT16)], selector, path);

		// forward a known prototype
		} else if (typeof def == 'number' && def >= PROTOTYPE_OFFSET && def < ARRAY_OFFSET) {
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
	 * @param {function} prototype - [optional] create this type during object instantiation
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

			// nullable primitive
			} else if (def < TYPED_ARRAY_OFFSET) {

				// non null
				if (this.reader.read(UINT8)) {
					return this.reader.read(def - NULLABLE_OFFSET);
				// null
				} else {
					return null;
				}

			// primitive typed array
			} else if (def < TYPE_OFFSET) {
				return this.reader.readTypedArray(def - TYPED_ARRAY_OFFSET, this.reader.read(UINT32));

			// custom type
			} else if (def < PROTOTYPE_OFFSET) {
				return this.reader.read(def);

			// known prototype
			} else if (def < ARRAY_OFFSET) {

				// nullable
				if (def >= NULLABLE_PROTOTYPE_OFFSET) {

					// null
					if (!this.reader.read(UINT8)) {
						return null;
					}

					def -= NULLABLE_PROTOTYPE_OFFSET;
				}

				let proto = this.protos[def];

				return this.parse(proto.definition ? proto.definition : this.objs[this.reader.read(UINT16)], proto.prototype);

			// variable-length fixed typed array 
			} else {

				let length = this.reader.read(UINT32);
				let objs = [];

				for (let i = 0; i < length; ++i) {
					objs.push(this.parse(def - ARRAY_OFFSET));
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

Tbjson.TYPES = { NULL, BOOL, INT8, UINT8, INT16, UINT16, INT32, UINT32, FLOAT32, FLOAT64, STRING, ARRAY, OBJECT, NULLABLE, TYPED_ARRAY, UNKNOWN, VARIABLE_DEF };

/**
 * Cast a plain object into the typed object it represents. Only supports prototype definitions, not strings.
 * 
 * @param {string} obj - object to parse
 * @param {function} obj - prototype to cast into
 */
Tbjson.cast = (obj, prototype = {}, definitions = {}) => {

	// object or array with a definition
	if (typeof obj == 'object') {

		let isArrayTypeDef = Array.isArray(prototype) && prototype.length == 2;

		// array
		if (Array.isArray(obj)) {

			let typedObj = [];

			// typed array
			if (isArrayTypeDef && prototype[0] == ARRAY) {
				for (let i = 0; i < obj.length; ++i) {
					typedObj.push(Tbjson.cast(obj[i], prototype[1], definitions));
				}
				
			// unknown array
			} else {
				for (let i = 0; i < obj.length; ++i) {
					typedObj.push(Tbjson.cast(obj[i], prototype[i], definitions));
				}
			}

			return typedObj;

		// uniform value object
		} else if (isArrayTypeDef && prototype[0] == OBJECT) {

			let typedObj = {};

			for (let key in obj) {
				typedObj[key] = Tbjson.cast(obj[key], prototype[1], definitions);
			}

			return typedObj;

		// nullable object
		} else if (isArrayTypeDef && prototype[0] == NULLABLE) {
			return obj == null ? null : Tbjson.cast(obj, prototype[1], definitions);

		// object
		} else if (prototype.tbjson && prototype.tbjson.definition) {

			let definition;

			// use map
			if (definitions[prototype.name]) {
				definition = definitions[prototype.name];

			// check for parent
			} else {

				definition = prototype.tbjson.definition;

				for (let parent = prototype; parent = getParent(parent);) {
					if (!parent.tbjson || !parent.tbjson.definition) { break; }
					definition = Object.assign({}, parent.tbjson.definition, definition);
				}

				definitions[prototype.name] = definition;
			}

			let typedObj = new prototype();

			for (let key in obj) {
				typedObj[key] = Tbjson.cast(obj[key], definition[key], definitions);
			}

			// call the build function for post construction
			if (prototype.tbjson.build) {
				prototype.tbjson.build(typedObj);
			}

			return typedObj;
		}
	}

	// primitive or untyped
	return obj;
}

/* internal */

/**
 * Return the parent of a prototype.
 * 
 * @param {function} prototype - prototype to check for parent of 
 */
function getParent(prototype) {
	let parent = prototype ? Object.getPrototypeOf(prototype) : null;
	return (parent && parent.name) ? parent : null;
}

/**
 * Returns a list of prototypes used in a definition.
 * 
 * @param {obj} obj - object to check
 */
function getPrototypesFromDefinition(obj) {

	let protos = [];

	if (Array.isArray(arr) && arr.length == 2) {
		protos = protos.concat(getPrototypesFromDefinition(arr[1]));
	} else if (typeof obj == 'function') {
		protos.push(obj);
	}
		
	return protos;
}