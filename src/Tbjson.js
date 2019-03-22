import fs from 'fs';

const STAMP = '.tbj';

const BYTE =    0;
const BOOL =    1;
const UINT =    2;
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

const CUSTOM_TYPE_OFFSET = 128;

const SIZES = {
	[FLOAT32]: 4
};

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
		this.buffer = new DynamicBuffer(stream, this.options.bufferSize);

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

	formatDef(def) {

	}

	processDef(obj, def) {
		for (let key in def) {
			this.buffer.write(def[key][0], obj[key]);
		}
	}

	process(obj, def) {
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
							this.classes[ref] = this.formatDef(obj.constructor.tbjson.def);
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

/* internal */

class DynamicBuffer {

	constructor(stream, size = 1024, xFactor = 2) {

		this.stream = stream;
		this.buffer = Buffer.allocUnsafe(size);
		this.xFactor = 2;

		this.offset = 0;
	}

	get size() {
		return this.buffer.length;
	}

	flush() {
		this.stream.write(this.buffer.slice(0, this.offset));
		this.offset = 0;
	}

	resize() {
		this.buffer = Buffer.concat(this.buffer, Buffer.allocUnsafe(this.size * Math.floor(this.xFactor / 2)));
	}

	write(type, val, length = 0) {
		switch (type) {
			case FLOAT32:
				if (this.offset + SIZES[type] > this.size) {
					this.flush();
				}
				this.buffer.writeFloatLE(val, this.offset);
				this.offset += 4;
				break;
			case STRING:
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
}
A.tbjson = {

};

class B {
	constructor() {
		this.as = [];
		for (let i = 0; i < 1000000; ++i) {
			this.as.push(new A());
		}
	}
}
B.tbjson = {
	ref: 'B',
	def: {
		as: [ARRAY, 'A']	
	}
};

/*
tbjson.registerClass(A, {
	x: FLOAT32,
	y: FLOAT32,
	z: FLOAT32
});

tbjson.registerClass(B, {
	as: [ARRAY, A]
});
*/

let x = {
	b: new B(),
	c: 'test',
	d: [12, 14, "est"]
};

/*
let x = {
	v: [],
	s: 'hello',
	r: {
		s: 'hello2',
		d: 45
	}
};

for (let i = 0; i < 10; ++i) {
	x.v.push(i);
}*/

console.time();
/*
for (let i = 0; i < x.v.length; ++i) {

}*/

//fs.writeFileSync("test.kk", JSON.stringify(x));

tbjson.serializeToFile('example.tbj', x);

//tbjson.process(x);

//tbjson.parseFile('example.tbj');

//setTimeout(() => {}, 5000);

console.timeEnd();