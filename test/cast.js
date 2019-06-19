export default function(Tbjson, stringify, validateTypes) {

	class A {
		bool = true;
		uint8 = 128;
		int8 = -127;
		uint16 = 2900;
		int16 = 3400;
		uint32 = 9999999;
		int32 = -9999999;
		float32 = 1000.123;
		float64 = 10000.1234567;
		string = '1234567890_+!@#$%^&*()';
		unknownBool = false;
		unknownNumber = 10.123;
		unknownString = 'unknown';
		unknownNull = null;
		array = [false, 100, 999.999];
	}

	A.tbjson = {
		definition: {
			bool: Tbjson.TYPES.BOOL,
			uint8: Tbjson.TYPES.UINT8,
			int8: Tbjson.TYPES.INT8,
			uint16: Tbjson.TYPES.UINT16,
			int16: Tbjson.TYPES.INT16,
			uint32: Tbjson.TYPES.UINT32,
			int32: Tbjson.TYPES.INT32,
			float32: Tbjson.TYPES.FLOAT32,
			float64: Tbjson.TYPES.FLOAT64,
			string: Tbjson.TYPES.STRING,
			unknownBool: Tbjson.TYPES.UNKNOWN,
			unknownNumber: Tbjson.TYPES.UNKNOWN,
			unknownString: Tbjson.TYPES.UNKNOWN,
			unknownNull: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.UNKNOWN],
			array: [Tbjson.TYPES.BOOL, Tbjson.TYPES.INT32, Tbjson.TYPES.FLOAT64]
		}
	};

	class B {
		array = [new A(), new A(), new A()];
		array2 = [[new A(), new A()], [new A()]];
		object = {
			'1': new A(),
			'2': new A(),
			'3': new A()
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
		nullableAndNullA = null;
		nullableAndNotA = new A();
	}
	B.tbjson = {
		definition: {
			array: [Tbjson.TYPES.ARRAY, A],
			array2: [Tbjson.TYPES.ARRAY, [Tbjson.TYPES.ARRAY, A]],
			object: [Tbjson.TYPES.OBJECT, A],
			object2: [Tbjson.TYPES.OBJECT, [Tbjson.TYPES.OBJECT, A]],
			nullableAndNullA: [Tbjson.TYPES.NULLABLE, A],
			nullableAndNotA: [Tbjson.TYPES.NULLABLE, A]
		}
	};

	class C {
		a = new A();
		b = new B();
	}
	C.tbjson = {
		definition: {
			a: A,
			b: B
		}
	};

	class D {
		a = new A();
		b = new B();
		c = new C();
		mixed = [new A(), new B(), new C()];
	}
	D.tbjson = {
		definition: {
			a: A,
			b: B,
			c: C,
			mixed: [A, B, C]
		}
	};

	class E extends D {
		string = 'string';
	}
	E.tbjson = {
		definition: {
			string: Tbjson.TYPES.STRING
		}
	};

	let x = new E();

	let typedX = Tbjson.cast(JSON.parse(stringify(x)), E);

	let invalid = validateTypes(x, typedX);
	if (invalid) { return invalid; }

	return [
		stringify(x),
		stringify(typedX)
	];
}