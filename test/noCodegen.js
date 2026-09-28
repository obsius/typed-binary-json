export default function(Tbjson, stringify) {

	let tbjson = new Tbjson(undefined, undefined, undefined, { codegen: false });

	class A {
		uint8 = 255;
		float64 = 100000.1234567;
		string = 'string';
		nullable = null;
		floats = new Float32Array([1.5, 2.5]);
	}
	A.tbjson = {
		definition: {
			uint8: Tbjson.TYPES.UINT8,
			float64: Tbjson.TYPES.FLOAT64,
			string: Tbjson.TYPES.STRING,
			nullable: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.FLOAT32],
			floats: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.FLOAT32]
		}
	};

	class B {
		value = 44;
		a = new A();
		maybe = null;
		as = [new A(), new A()];
		byName = { first: new A(), second: new A() };
		untyped = [10, 10.0001, true, 'apple'];
		plain = { float: 10.994, bool: false, sub: { string: 'string' } };
	}
	B.tbjson = {
		definition: {
			value: Tbjson.TYPES.STRING,
			a: A,
			maybe: [Tbjson.TYPES.NULLABLE, A],
			as: [Tbjson.TYPES.ARRAY, A],
			byName: [Tbjson.TYPES.OBJECT, A],
			untyped: Tbjson.TYPES.ARRAY,
			plain: Tbjson.TYPES.OBJECT
		},
		unbuild: (obj) => ({ ...obj, value: '' + obj.value }),
		build: (obj) => {
			obj.value = parseFloat(obj.value);
		}
	};

	let x = {
		b: new B(),
		bs: [new B()]
	};

	return [
		stringify(x),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)))
	];
}
