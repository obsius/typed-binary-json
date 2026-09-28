export default function(Tbjson, stringify) {

	let tbjson = new Tbjson();

	class A {
		uint8 = 255;
		float64 = 100000.1234567;
		string = 'string';
		nullable = null;
	}
	A.tbjson = {
		definition: {
			uint8: Tbjson.TYPES.UINT8,
			float64: Tbjson.TYPES.FLOAT64,
			string: Tbjson.TYPES.STRING,
			nullable: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.FLOAT32]
		}
	};

	let x = {
		int: 999,
		as: [new A(), new A()],
		object: {
			float: 10.994,
			a: new A()
		}
	};

	let buffer = tbjson.serializeToBuffer(x);

	let expected = stringify(x);
	let results = [
		stringify(tbjson.parseBuffer(buffer)),
		stringify(new Tbjson().parseBuffer(buffer)),
		stringify(new Tbjson().parseBuffer(buffer))
	];

	return [
		JSON.stringify([expected, expected, expected]),
		JSON.stringify(results)
	];
}
