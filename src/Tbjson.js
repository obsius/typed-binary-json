import fs from 'fs';

import {
	MAGIC_NUMBER,
	SIZE_MAGIC_NUMBER,
	VERSION,
	ERROR,

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
	INSTANCE,

	SIZE_UINT32,
	
	NULLABLE_OFFSET,
	TYPED_ARRAY_OFFSET,
	TYPE_OFFSET,
	PROTOTYPE_OFFSET,
	NULLABLE_PROTOTYPE_OFFSET,
	ARRAY_OFFSET,
	OBJECT_OFFSET,

	L_NULLABLE_PROTOTYPE_OFFSET,
	L_ARRAY_OFFSET,
	L_OBJECT_OFFSET,

	DEFAULT_BUFFER_SIZE,
	DEFAULT_NUM_ENCODING,
	DEFAULT_STR_ENCODING,
	DEFAULT_X_FACTOR
} from './constants';

import Prototype from './Prototype';

import BufferReader from './utility/BufferReader';
import BufferWriter from './utility/BufferWriter';
import StreamBufferReader from './utility/StreamBufferReader';
import StreamBufferWriter from './utility/StreamBufferWriter';
import getParent from './utility/getParent';

import Type from './types/Type';
import BigIntType from './types/BigIntType';
import DateType from './types/DateType';
import RegexType from './types/RegexType';

import cast from './functions/cast';
import clone from './functions/clone';
import definition from './functions/definition';
import flattenValidation from './functions/flattenValidation';
import serialize from './functions/serialize';
import validate from './functions/validate';

/**
 * Tbjson
 * 
 * A JS TBJSON serializer and parser.
 */
export default class Tbjson {

	version = VERSION;

	// for registered types (primitives)
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
	nextObjCode = 0;
	nextTypeCode = TYPE_OFFSET;
	nextProtoCode;

	finalized = false;

	// default offsets
	offsets = {
		prototype: PROTOTYPE_OFFSET,
		nullablePrototype: NULLABLE_PROTOTYPE_OFFSET,
		array: ARRAY_OFFSET,
		object: OBJECT_OFFSET
	};

	// default options
	options = {
		bufferSize: DEFAULT_BUFFER_SIZE,
		numEncoding: DEFAULT_NUM_ENCODING,
		strEncoding: DEFAULT_STR_ENCODING,
		xFactor: DEFAULT_X_FACTOR
	};
	
	constructor(types = [], prototypes = [], offsets = {}, options = {}) {

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

		} catch(e) {
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

		} catch(e) {
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
Tbjson.Types = { BigIntType, DateType, RegexType };

// functions
Tbjson.cast = cast;
Tbjson.clone = clone;
Tbjson.definition = definition;
Tbjson.flattenValidation = flattenValidation;
Tbjson.serialize = serialize;
Tbjson.validate = validate;