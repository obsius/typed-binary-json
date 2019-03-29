export default function(Tbjson, stringify) {

	let tbjson = new Tbjson();

	class A {
		uint8 = 255;
		float64 = 100000.1234567;
		string = 'string';
		object = {
			string: "string",
			bool: true,
			float: 11.001
		};
	}
	A.tbjson = {
		definition: {
			uint8: Tbjson.TYPES.UINT8,
			float64: Tbjson.TYPES.FLOAT64,
			string: Tbjson.TYPES.STRING,
			object: Tbjson.TYPES.OBJECT
		}
	};

	let x = {
		int: 999,
		string: 'string',
		array: [10, 10.0001, true, 'apple'],
		a: new A(),
		null: null
	};

	return [
		stringify(x.a.object),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x), ['a', 'object']))
	];
}