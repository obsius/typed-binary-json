export default function(Tbjson, stringify) {

	let tbjson = new Tbjson();

	class A {
		uint8 = 255;
		float64 = 100000.1234567;
		string = 'string';
	}
	A.tbjson = {
		definition: {
			uint8: Tbjson.TYPES.UINT8,
			float64: Tbjson.TYPES.FLOAT64,
			string: Tbjson.TYPES.STRING
		}
	};

	class B {
		float32 = 100.12345;
		a = new A();
		as = [];

		constructor() {
			for (let i = 0; i < 10; ++i) {
				this.as.push(new A());
			}
		}
	}
	B.tbjson = {
		definition: {
			float32: Tbjson.TYPES.FLOAT32,
			a: A,
			as: [Tbjson.TYPES.ARRAY, A]
		}
	};

	let x = {
		b: new B()
	};

	return [
		stringify(x),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)))
	];
}