export default function(Tbjson, stringify) {

	let tbjson = new Tbjson();

	class A {
		uint8 = 255;
		float64 = 100000.1234567;
		string = 'string';
		array = ['apple', 'bacon', 'grape'];
		array2 = [['a1', 'a2', 'a3'], ['b1', 'b2'], ['c1']];
	}
	A.tbjson = {
		definition: {
			uint8: Tbjson.TYPES.UINT8,
			float64: Tbjson.TYPES.FLOAT64,
			string: Tbjson.TYPES.STRING,
			array: [Tbjson.TYPES.ARRAY, Tbjson.TYPES.STRING],
			array2: [Tbjson.TYPES.ARRAY, [Tbjson.TYPES.ARRAY, Tbjson.TYPES.STRING]]
		}
	};

	class B {
		float32 = 100.12345;
		a = new A();
		array = [new A(), new A()];
		array2 = [[new A(), new A()], [new A()]];
		object = {
			'1': new A(),
			'2': new A()
		};
		object2 = {
			'1': {
				'1': new A(),
				'2': new A()
			},
			'2': {
				'1': new A()
			}
		};

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
			array: [Tbjson.TYPES.ARRAY, A],
			array2: [Tbjson.TYPES.ARRAY, [Tbjson.TYPES.ARRAY, A]],
			object: [Tbjson.TYPES.OBJECT, A],
			object2: [Tbjson.TYPES.OBJECT, [Tbjson.TYPES.OBJECT, A]],
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