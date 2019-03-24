import fs, { writeSync } from 'fs';

// magic number for file type
const MAGIC_NUMBER = '.tbj';
const SIZE_MAGIC_NUMBER = 8;


// types
const NULL =    0;
const BYTE =    1;
const BOOL =    2;
const INT8 =    3;
const UINT8 =   4;
const INT16 =   5;
const UINT16 =  6;
const INT32 =   7;
const UINT32 =  8;
const FLOAT32 = 9;
const FLOAT64 = 10;
const STRING =  11;
const ARRAY =   12;
const OBJECT =  13;
const CUSTOM =  14;

// type sizes
const SIZE_NULL =    1;
const SIZE_BYTE =    1;
const SIZE_BOOL =    1;
const SIZE_INT8 =    1;
const SIZE_UINT8 =   1;
const SIZE_INT16 =   2;
const SIZE_UINT16 =  2;
const SIZE_INT32 =   4;
const SIZE_UINT32 =  4;
const SIZE_FLOAT32 = 4;
const SIZE_FLOAT64 = 8;

const TYPE_OFFSET =  32;
const CLASS_OFFSET = 64;
const ARRAY_OFFSET = 512;

// defaults
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
	
	serialize(stream, obj) {
		
		// make a writer
		this.writer = new StreamBufferWriter(stream, this.options.bufferSize);

		// process the obj
		this.header = {
			classes: this.classes,
			root: this.process(obj)
		};
		
		// flush and cleanup
		this.writer.flush();
		this.writer = null;
	}

	serializeToFile(filename, obj) {
		return new Promise((res, rej) => {
			try {
				let tempFilename = `${filename}.tmp`;

				// write the data to a tmp file
				let writeStream = fs.createWriteStream(tempFilename, 'binary');
				this.serialize(writeStream, obj);
				writeStream.end();

				// write the final file
				writeStream = fs.createWriteStream(filename, 'binary');

				let headerString = JSON.stringify(this.header);

				let headerLengthBuffer = Buffer.allocUnsafe(4);
				headerLengthBuffer.writeUInt32LE(headerString.length);

				// write out the magic number, header length, and header
				writeStream.write(MAGIC_NUMBER, 'utf-8');
				writeStream.write(headerLengthBuffer);
				writeStream.write(headerString, 'utf-8');

				// pipe the tmp file to the final file
				let readStream = fs.createReadStream(tempFilename, 'binary');
				readStream.pipe(writeStream);

				readStream.on('end', () => {

					// cleanup
					fs.unlinkSync(tempFilename);

					res();
				});
			} catch (e) {
				rej(new Error(`Tbjson Failed to serialize object to "${filename}: ` + e));
			}
		});
	}
	
	parse(stream) {
		return new Promise((res, rej) => {
			let reader = new StreamBufferReader(stream);

			reader.read(SIZE_MAGIC_NUMBER, (data) => {
				if (data.toString() != MAGIC_NUMBER) {
					console.log(data);
					//reader.dispose();
					rej(new Error('Stream is not a Typed Binary JSON format'));
				} else {
					reader.read(SIZE_INT32, (data) => {
						let headerEnd = data.readInt32LE(0);

						reader.read(headerEnd - (SIZE_MAGIC_NUMBER + SIZE_INT32), (data) => {
							let header = data.toJSON();

							console.log(header);
							res(header);

						});
					});
				}
			});
		});
	}

	parseFile(filename) {
		return this.parse(fs.createReadStream(filename));
	}

	/* private */

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

	processDef(obj, def) {

	//	console.log("o", obj);
	//	console.log("d", def);
	//	console.log("-------");

		// is typed
		if (typeof def == 'number') {

			// is variable-length fixed typed array 
			if (def > ARRAY_OFFSET) {
				for (let i = 0; i < obj.length; ++i) {
					this.processDef(obj[i], def ^ ARRAY_OFFSET);
				}
				this.writer.write(NULL);

			// class object
			} else if (def > CLASS_OFFSET) {
				this.addClass(obj);
				this.processDef(obj, this.classes[def]);

			// is primitive
			} else {
				this.writer.write(def, obj);
				if (def == STRING) { this.writer.write(NULL); }
			}

		// is a sub object or array
		} else {

			// is fixed-length variable type array
			if (Array.isArray(def)) {
				for (let i = 0; i < def.length; ++i) {
					this.processDef(obj[i], def[i]);
				}

			// is a sub object
			} else {
				for (let key in def) {
					this.processDef(obj[key], def[key]);
				}
			}
		}
	}

	process(obj) {
		switch (typeof obj) {
			case 'boolean':
				this.writer.write(BOOL, obj);
				return BOOL;

			case 'number':
				this.writer.write(FLOAT32, obj);
				return FLOAT32;

			case 'string':
				this.writer.write(STRING, obj);
				return [STRING, obj.length];

			case 'object':
				if (Array.isArray(obj)) {

					let refs = [];

					for (let i = 0; i < obj.length; ++i) {
						refs.push(this.process(obj[i]));
					}

					return refs;

				} else {

					// the object is a known tbjson class
					if (obj.constructor && obj.constructor.tbjson) {

						// add this object type to the known classes
						let code = this.addClass(obj);

						// process the class
						this.processDef(obj, this.classes[code]);

						return code;
					}

					let ref = {};

					for (let key in obj) {
						ref[key] = this.process(obj[key]);
					}

					return ref;
				}
		}
		
	}
}

Tbjson.TYPES = { BYTE, BOOL, INT8, UINT8, INT16, UINT16, INT32, UINT32, FLOAT32, FLOAT64, STRING, ARRAY, OBJECT, CUSTOM };

/* internal */

class StreamBufferWriter {

	streamIndex = 0;
	streamReady = true;
	offset = 0;

	constructor(stream, size = 16384, xFactor = 2) {
		this.stream = stream;
		this.buffer = Buffer.allocUnsafe(size);
		this.xFactor = xFactor;
	}

	get size() {
		return this.buffer.length;
	}

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
	}

	resize() {
		this.buffer = Buffer.concat([this.buffer, Buffer.allocUnsafe(this.size * Math.floor(this.xFactor / 2))]);
	}

	checkFlush(length) {
		if (this.offset + length > this.size) {
			if (this.streamReady) {
				this.flush();
			} else {
				this.resize();
			}
		}
	}

	write(type, val, length = 0) {
		switch (type) {
			case NULL:
				this.checkFlush(SIZE_NULL);
				this.buffer.writeUInt8(0, this.offset);
				this.offset += SIZE_NULL;
				break;

			case FLOAT32:
				this.checkFlush(SIZE_FLOAT32);
				this.buffer.writeFloatLE(val, this.offset);
				this.offset += SIZE_FLOAT32;
				break;

			case STRING:
				this.checkFlush(val.length);
				this.buffer.write(val, this.offset, val.length, 'utf-8');
				this.offset += val.length;
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

		this.stream.on('data', (chunk) => {
			if (this.writeOffset + chunk.length > this.tempSize) {
				this.stream.pause();
			}

			this.buffer.fill(chunk, this.writeOffset, this.writeOffset + chunk.length);
			
			if (this.waitingRead) {
				this.waitingRead();
			}
		});
	}

	readUntilNull(fn) {
		for (let i = this.readOffset; i < this.buffer.length; ++i) {
			if (this.buffer[i] == null) {
				fn(this.buffer.slice(this.offset, i));
				this.incOffset(i - this.readOffset);
			}
		}
	}

	read(length, fn) {

		if (this.offset + length > this.buffer.length) {

			if (this.size < this.offset + length) {
				this.tmpSize = this.offset + length;
			}
			
			this.waitingRead = () => {
				this.tempSize = this.size;
				this.read(length, fn)
			};
		} else {
			fn(this.buffer.slice(this.offset, length));
			this.incOffset(length);
		}
	}

	/* private */

	incOffset(length) {
		this.readOffset += length;

		if (this.readOffset > this.size) {

			this.writeOffset = this.buffer.length - this.writeOffset;
			this.readOffset = 0;

			this.newBuffer = Buffer.allocUnsafe(this.size);
			this.newBuffer.fill(this.offset, this.buffer.length);
			this.buffer = this.newBuffer;

			if (this.stream.isPaused()) { this.stream.resume(); }
		}
	}
}




/* TESTS */

let tbjson = new Tbjson();

class A {
	x = 12234345.343452;
	y = 15234234.124525;
	z = 23123231235.14134;
	zz = {
		a: 'a',
		b: 12,
		c: [-1.2, false]
	}
}
A.tbjson = {
	ref: 'A',
	def: {
		x: Tbjson.TYPES.FLOAT32,
		z: Tbjson.TYPES.FLOAT32,
		y: Tbjson.TYPES.FLOAT32,
		zz: {
			a: Tbjson.TYPES.STRING,
			b: Tbjson.TYPES.FLOAT32,
			c: [Tbjson.TYPES.FLOAT32, Tbjson.TYPES.BOOL]
		}
	}
};

class B {
	constructor() {

		this.as = [];
		for (let i = 0; i < 100; ++i) {
			this.as.push(new A());
		}

		this.b = 'b';
	}
}
B.tbjson = {
	ref: 'B',
	def: {
		as: [Tbjson.TYPES.ARRAY, 'A']
	}
};

let x = {
	b: new B(),
	c: 'test',
	d: [12, 14, 'est'],
	e: []
};

for (let i = 0; i < 10; ++i) {
	x.e.push(i);
}

console.log("STARTING");

(async function() {

	console.time();

	//fs.writeFileSync("test.kk", JSON.stringify(x));

	//await tbjson.serializeToFile('example.tbj', x);

	//tbjson.process(x);

	let data = tbjson.parseFile('example.tbj');
	console.log(data);

	console.timeEnd();

})();