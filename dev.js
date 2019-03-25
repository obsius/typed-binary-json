import fs from 'fs';
import Tbjson from './src/Tbjson';

let tbjson = new Tbjson();

class A {
	x = 100000.666666666666;
	y = -999999.999;
	z = 1234.56789;
}
A.tbjson = {
	ref: 'A',
	def: {
		x: Tbjson.TYPES.FLOAT32,
		z: Tbjson.TYPES.FLOAT32,
		y: Tbjson.TYPES.FLOAT32
	}
};

class B {
	as = [];

	constructor() {
		for (let i = 0; i < 10000; ++i) {
			this.as.push(new A());
		}
	}
}
B.tbjson = {
	ref: 'B',
	def: {
		as: [Tbjson.TYPES.ARRAY, 'A']
	}
}

let root = new B();

(async function() {

	try {
		console.time();

		let data;

		//await tbjson.serializeToFile('tbjson.tbj', root);

		data = tbjson.parseFileAsBuffer('tbjson.tbj');

		//console.log(data);
		//console.log(JSON.stringify(data));

		console.timeEnd();
	} catch(e) {
		console.error(e);
	}

})();