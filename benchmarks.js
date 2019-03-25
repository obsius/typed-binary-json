import fs from 'fs';
import Tbjson from './src/Tbjson';

let tbjson = new Tbjson();

/* setup */

class A {
	x = 100000.666666666666;
	y = -999999.999;
	z = 1234.56789;
	extraDetails = {
		alpha: 'oranges',
		beta: 10,
		gamma: [-3.14159, false, true, '!@#$%^&*()']
	}
}

A.tbjson = {
	ref: 'A',
	def: {
		x: Tbjson.TYPES.FLOAT32,
		z: Tbjson.TYPES.FLOAT32,
		y: Tbjson.TYPES.FLOAT32,
		extraDetails: {
			alpha: Tbjson.TYPES.STRING,
			beta: Tbjson.TYPES.UINT8,
			gamma: [Tbjson.TYPES.FLOAT32, Tbjson.TYPES.BOOL, Tbjson.TYPES.BOOL, Tbjson.TYPES.STRING]
		}
	}
};

class B {
	second = [];
	anotherString = 'apples';
	number = 86;
	bool = true;
	fixedArray = [0, 1, 2, 3, 5, 6, 7, 8, 9];
}
B.tbjson = {
	ref: 'B',
	def: {
		second: [Tbjson.TYPES.ARRAY, 'A'],
		anotherString: Tbjson.TYPES.STRING,
		number: Tbjson.TYPES.FLOAT32,
		bool: Tbjson.TYPES.BOOL,
		fixedArray: [
			Tbjson.TYPES.INT16,
			Tbjson.TYPES.INT16,
			Tbjson.TYPES.INT16,
			Tbjson.TYPES.INT16,
			Tbjson.TYPES.INT16,
			Tbjson.TYPES.INT16,
			Tbjson.TYPES.INT16,
			Tbjson.TYPES.INT16,
			Tbjson.TYPES.INT16,
			Tbjson.TYPES.INT16
		]
	}
};

class C {
	first = [];
}
C.tbjson = {
	ref: 'C',
	def: {
		first: [Tbjson.TYPES.ARRAY, 'B']
	}
}

let root = new C();

for (let i = 0; i < 100; ++i) {

	let first = new B();

	for (let i = 0; i < 10000; ++i) {
		first.second.push(new A());
	}

	root.first.push(first);
}

/* benchmarks */

(async function() {

	try {
		let data;

		console.log('Running benchmarks...');

		console.time('JSON Write');
		fs.writeFileSync('json._json', JSON.stringify(root));
		console.timeEnd('JSON Write');

		console.time('Tbjson Write');
		await tbjson.serializeToFile('tbjson.tbj', root);
		console.timeEnd('Tbjson Write');

		console.time('JSON Read');
		data = JSON.parse(fs.readFileSync('json._json'));
		console.timeEnd('JSON Read');

		console.time('Tbjson Read');
		data = tbjson.parseFileAsBuffer('tbjson.tbj');
		console.timeEnd('Tbjson Read');

		//console.log(data);
		//console.log(JSON.stringify(data));

		console.log('Done');
	} catch(e) {
		console.error('Error running benchmarks for Tbjson: ' + e);
	}

})();