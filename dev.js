import fs, { exists } from 'fs';
import Tbjson from './src/Tbjson';

class Z {
	x = 100000.666666666666;
	y = -999999.999;
	z = 1234.56789;
}

Z.tbjson = {
	definition: {
		x: Tbjson.TYPES.FLOAT32,
		z: Tbjson.TYPES.FLOAT32,
		y: Tbjson.TYPES.FLOAT32
	}
};

class A extends Z {
	a = null;
	q = '09123123123123';
}
/*
A.tbjson = {
	ref: 'A',
	def: {
		x: Tbjson.TYPES.FLOAT32,
		z: Tbjson.TYPES.FLOAT32,
		y: Tbjson.TYPES.FLOAT32
	}
};
*/

class B {
	as = [];
	start = "START";
	u8 = new Uint8Array(2);
	u16 = new Uint16Array(2);
	i32 = new Int32Array(2);
	f64 = new Float64Array(2);
	end = "END";

	constructor() {
		for (let i = 0; i < 1000000; ++i) {
			this.as.push(new A());
		}
		
		for (let i = 0; i < this.u8.length; ++i) {
			this.u8[i] = i;
		}
		
		for (let i = 0; i < this.u16.length; ++i) {
			this.u16[i] = i;
		}

		for (let i = 0; i < this.i32.length; ++i) {
			this.i32[i] = i;
		}
		
		for (let i = 0; i < this.f64.length; ++i) {
			this.f64[i] = i;
		}
	}
}
/*
B.tbjson = {
	ref: 'B',
	def: {
		as: [Tbjson.TYPES.ARRAY, 'A']
	}
}
*/


let root = {
	b: new B(),
	c: null
};
/*
console.time();
let x = [];
for (let i = 0; i < 1000000; ++i) {
	x.push( new A());
}
console.timeEnd();
process.exit(1);
*/

/*
console.time();
let a = fs.readFileSync('j.json');
let root = JSON.parse(a);
console.timeEnd();
exit;

*/
(async function() {

	try {
		

		let tbjson = new Tbjson();

		tbjson.registerPrototype(Z);

		tbjson.registerPrototype({
			prototype: A,
			definition: {
				a: Tbjson.TYPES.INT8,
				q: Tbjson.TYPES.STRING
			}
		});

		tbjson.registerPrototype({
			prototype: B,
			definition: {
				as: [Tbjson.TYPES.ARRAY, A],
				start: Tbjson.TYPES.STRING,
				u8: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.UINT8],
				u16: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.UINT16],
				i32: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.INT32],
				f64: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.FLOAT64],
				end: Tbjson.TYPES.STRING
			}
		});

		tbjson.finalizePrototypes();

		let data;
		let buffer;

	//	await tbjson.serializeToFile('tbjson.__tbj', root);

		buffer = tbjson.serializeToBuffer(root);

		//fs.writeFileSync('___M.json', tbjson.getHeaderAsBuffer());
		console.time();
		data = tbjson.parseBuffer(buffer);

	//	data = tbjson.parseFileAsBuffer('tbjson.__tbj');

		//console.log(data.b.as);
		//console.log(JSON.stringify(data));

		console.timeEnd();
	} catch(e) {
		console.error(e);
	}

	//setTimeout(() => {}, 600000);

})();