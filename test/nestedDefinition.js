export default function(Tbjson, stringify) {

	let tbjson = new Tbjson();

	class A {
		vals = {
			a: [
				[8192, 0, 3.14159],
				[8192, 0, 3.14159]
			],
			b: ['a', true, null],
			c: {
				1: {
					2: [1, 2]
				}
			}
		};
	}
	A.tbjson = {
		definition: {
			vals: {
				a: [Tbjson.TYPES.ARRAY, [Tbjson.TYPES.UINT32, Tbjson.TYPES.UINT8, Tbjson.TYPES.FLOAT64]],
				b: [Tbjson.TYPES.STRING, Tbjson.TYPES.BOOL, [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.FLOAT32]],
				c: [Tbjson.TYPES.OBJECT, [Tbjson.TYPES.OBJECT, [Tbjson.TYPES.UINT8, Tbjson.TYPES.UINT8]]]
			}
		}
	};

	let x = new A();

	return [
		stringify(x),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)))
	];
}