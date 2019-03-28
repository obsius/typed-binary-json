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
	};
	float32Array = new Float32Array(100);
	int16Array = new Int16Array(100);

	constructor() {
		for (let i = 0; i < this.float32Array.length; ++i) {
			this.float32Array[i] = i;
			this.int16Array[i] = i;
		}
	}
}

A.tbjson = {
	definition: {
		x: Tbjson.TYPES.FLOAT32,
		z: Tbjson.TYPES.FLOAT32,
		y: Tbjson.TYPES.FLOAT32,
		extraDetails: {
			alpha: Tbjson.TYPES.STRING,
			beta: Tbjson.TYPES.UINT8,
			gamma: [Tbjson.TYPES.FLOAT32, Tbjson.TYPES.BOOL, Tbjson.TYPES.BOOL, Tbjson.TYPES.STRING]
		},
		float32Array: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.FLOAT32],
		int16Array:[Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.INT16]
	}
};

class B {
	second = [];
	anotherString = 'apples';
	number = 86;
	bool = true;
	fixedArray = [0, 1, 2, 3, 5, 6, 7, 8, 9];

	constructor() {
		for (let i = 0; i < 1000; ++i) {
			this.second.push(new A());
		}
	}
}
B.tbjson = {
	definition: {
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

	constructor() {
		for (let i = 0; i < 100; ++i) {
			this.first.push(new B());
		}
	}
}
C.tbjson = {
	definition: {
		first: [Tbjson.TYPES.ARRAY, 'B']
	}
}

let root = {
	c: new C(),
	typedArray: new Uint32Array(100)
};

for (let i = 0; i < root.typedArray.length; ++i) {
	root.typedArray[i] = i;
}


/* benchmarks */

(async function() {

	try {

		console.log('Running benchmarks...');

		console.time('JSON Write');
		//fs.writeFileSync('json._json', JSON.stringify(root));
		let json = JSON.stringify(root)
		console.timeEnd('JSON Write');

		console.time('Tbjson Write');
		//await tbjson.serializeToFile('tbjson.tbj', root);
		let data = tbjson.serializeToBuffer(root);
		console.timeEnd('Tbjson Write');

		console.time('JSON Read');
		//data = JSON.parse(fs.readFileSync('json._json'));
		JSON.parse(json);
		console.timeEnd('JSON Read');

		console.time('Tbjson Read');
		//data = tbjson.parseFileAsBuffer('tbjson.tbj');
		tbjson.parseBuffer(data);
		console.timeEnd('Tbjson Read');

		//console.log(data);
		//console.log(data.c.first[0].second);
		//console.log(JSON.stringify(data));

		console.log('Done');
	} catch(e) {
		console.error('Error running benchmarks for Tbjson: ',  e);
	}

})();