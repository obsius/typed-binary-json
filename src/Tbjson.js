import fs from 'fs';

// stamp for file type
const STAMP = '.tbj';

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

const CUSTOM_TYPE_OFFSET = 128;

/**
 * Tbjson
 */
export default class Tbjson {
	
	classes = {};
	types = {};
	options = {
		encStringAs: 'utf-8',
		encNumberAs: 'float32',
		bufferSize: 65536
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
	
	registerType(type) {
		
	}
	
	registerTypes(types) {
		for (let obj of types) {
			this.registerType(obj);
		}	
	}
	
	serialize(stream, obj) {
		
		// make a buffer
		this.buffer = new StreamBufferWriter(stream, this.options.bufferSize);

		// write out the stamp
		this.buffer.write(STRING, STAMP);

		// process the obj
		this.header = this.process(obj);

		// write out the header
		this.buffer.write(STRING, JSON.stringify(this.header));
		
		// flush and cleanup
		this.buffer.flush();
		this.buffer = null;
	}

	serializeToFile(filename, obj) {
		let stream = fs.createWriteStream(filename, 'binary');
		this.serialize(stream, obj);
		stream.end();
	}
	
	parse(stream) {
		
		let buffer;
		
		stream.on('data', (chunk) => {
			console.log(chunk.length);
		});
		
		stream.on('end', () => {
			
		});
	}

	parseFile(filename) {
		return this.parse(fs.createReadStream(filename));
	}

	/* private */

	// TODO diff between ref and def
	addDef(ref, def) {
		switch (typeof subDef) {
			case 'string':

				return [subDef];

			case 'object':
				if (Array.isArray(subDef)) {
					return subDef;
				} else {
					let 
					for (let key in def) {
						let subDef = def[key];
						return formatDef;
					}
				}
				break;

			case 'number':
			case 'boolean':
				// invalid
				break;
		}

	}

	processDef(obj, def) {

		// is a primitive
		if (typeof def == 'number') {
			this.buffer.write(def, obj);
			if (def == STRING) { this.buffer.write(NULL); }

		// is a sub object or array
		} else {

			// is def or array
			if (Array.isArray(def)) {

				// is fixed-length variable type array
				if (Array.isArray(def[0])) {
					for (let i = 0; i < def.length; ++i) {
						processDef(obj[i], def[i]);
					}

				// is variable-length fixed typed array
				} else if (def[0] == ARRAY) {
					for (let i = 0; i < obj.length; ++i) {
						processDef(obj[i], def[0]);
					}
					this.buffer.write(NULL);

				// is custom
				} else if (def[0] == CUSTOM) {
					this.processDef(obj, this.classes[def[1]]);

				// is def
				} else {
					this.processDef(obj, def[0]);
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
				this.buffer.write(BOOL, obj);
				return BOOL;

			case 'string':
				this.buffer.write(STRING, obj);
				return [STRING, obj.length];

			case 'number':
				this.buffer.write(FLOAT32, obj);
				return FLOAT32;

			case 'object':
				if (Array.isArray(obj)) {

					let refs = [];

					for (let item of obj) {
						refs.push(this.process(item));
					}

					return refs;

				} else {

					if (obj.constructor && obj.constructor.tbjson) {

						let ref = obj.constructor.tbjson.ref;
						let def = obj.constructor.tbjson.def

						if (!this.classes[ref]) {
							this.addDef(ref, def);
						}

						this.processDef(obj, obj.constructor.tbjson.def);

						return ref;
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

	constructor(stream, size = 16384, xFactor = 2) {

		this.stream = stream;
		this.buffer = Buffer.allocUnsafe(size);
		this.xFactor = 2;

		this.offset = 0;
	}

	get size() {
		return this.buffer.length;
	}

	flush() {
		this.streamReady = false;

		this.stream.write(this.buffer.slice(0, this.offset), (rdy) => {
			this.streamReady = true;
		});

		this.offset = 0;
	}

	resize() {
		this.buffer = Buffer.concat(this.buffer, Buffer.allocUnsafe(this.size * Math.floor(this.xFactor / 2)));
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
				this.buffer.writeByte(0, this.offset++);
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
		for (let i = 0; i < 1000000; ++i) {
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

console.time();

//fs.writeFileSync("test.kk", JSON.stringify(x));

tbjson.serializeToFile('example.tbj', x);

//tbjson.process(x);

//tbjson.parseFile('example.tbj');

//setTimeout(() => {}, 5000);

console.timeEnd();