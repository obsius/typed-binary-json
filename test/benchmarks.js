export default function(Tbjson) {

	class A {
		static make() {
			let a = new A();
			a.x = 100000.666666666666;
			a.y = -999999.999;
			a.z = 1234.5678901234;
			a.details = { alpha: 'oranges', beta: 10, gamma: [-3.14159, false, true, '!@#$%^&*()'] };
			return a;
		}
	}
	A.tbjson = {
		definition: {
			x: Tbjson.TYPES.FLOAT32,
			y: Tbjson.TYPES.FLOAT32,
			z: Tbjson.TYPES.FLOAT32,
			details: {
				alpha: Tbjson.TYPES.STRING,
				beta: Tbjson.TYPES.UINT8,
				gamma: [Tbjson.TYPES.FLOAT32, Tbjson.TYPES.BOOL, Tbjson.TYPES.BOOL, Tbjson.TYPES.STRING]
			}
		}
	};

	class B {
		static make() {
			let b = new B();
			b.second = Array.from({ length: 10000 }, A.make);
			b.anotherString = 'apples';
			b.number = 86;
			b.bool = true;
			b.array = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
			return b;
		}
	}
	B.tbjson = {
		definition: {
			second: [Tbjson.TYPES.ARRAY, A],
			anotherString: Tbjson.TYPES.STRING,
			number: Tbjson.TYPES.UINT8,
			bool: Tbjson.TYPES.BOOL,
			array: [Tbjson.TYPES.ARRAY, Tbjson.TYPES.INT16]
		}
	};

	class C {
		static make() {
			let c = new C();
			c.first = Array.from({ length: 100 }, B.make);
			return c;
		}
	}
	C.tbjson = {
		definition: {
			first: [Tbjson.TYPES.ARRAY, B]
		}
	};

	let root = { root: C.make() };
	let tbjson = new Tbjson(undefined, undefined, undefined, { codegen: process.env.CODEGEN != '0' });
	let mb = (bytes) => (bytes / 1048576).toFixed(0) + ' MB';

	global.gc?.();
	console.time('JSON Write');
	let json = JSON.stringify(root);
	console.timeEnd('JSON Write');

	global.gc?.();
	console.time('TBJSON Write');
	let buffer = tbjson.serializeToBuffer(root);
	console.timeEnd('TBJSON Write');

	global.gc?.();
	console.time('JSON Read');
	JSON.parse(json);
	console.timeEnd('JSON Read');

	global.gc?.();
	console.time('TBJSON Read');
	tbjson.parseBuffer(buffer);
	console.timeEnd('TBJSON Read');

	console.log('JSON', mb(Buffer.byteLength(json)), '  TBJSON', mb(buffer.length));
}
