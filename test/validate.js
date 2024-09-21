export default function(Tbjson, stringify) {

	class A {
		validBool = true;
		validUint8 = 128;
		validInt8 = -127;
		validInt16 = 3400;
		validUint16 = 10000;
		validUint32 = 9999999;
		validInt32 = -9999999;
		validFloat32 = 1000.123;
		validFloat64 = 10000.1234567;
		validString = 'string';

		invalidBool1 = 12;
		invalidBool2 = '';
		invalidUint8 = -1;
		invalidInt8 = false;
		invalidUint16 = '123';
		invalidInt16 = null;
		invalidUint32 = {};
		invalidInt32 = Number.MAX_SAFE_INTEGER;
		invalidFloat32 = /regex/;
		invalidFloat64 = Number.NaN;
		invalidString = 12;
	}

	A.tbjson = {
		definition: {
			validBool: Tbjson.TYPES.BOOL,
			validUint8: Tbjson.TYPES.UINT8,
			validInt8: Tbjson.TYPES.INT8,
			validUint16: Tbjson.TYPES.UINT16,
			validInt16: Tbjson.TYPES.INT16,
			validUint32: Tbjson.TYPES.UINT32,
			validInt32: Tbjson.TYPES.INT32,
			validFloat32: Tbjson.TYPES.FLOAT32,
			validFloat64: Tbjson.TYPES.FLOAT64,
			validString: Tbjson.TYPES.STRING,

			invalidBool1: Tbjson.TYPES.BOOL,
			invalidBool2: Tbjson.TYPES.BOOL,
			invalidUint8: Tbjson.TYPES.UINT8,
			invalidInt8: Tbjson.TYPES.INT8,
			invalidUint16: Tbjson.TYPES.UINT16,
			invalidInt16: Tbjson.TYPES.INT16,
			invalidUint32: Tbjson.TYPES.UINT32,
			invalidInt32: Tbjson.TYPES.INT32,
			invalidFloat32: Tbjson.TYPES.FLOAT32,
			invalidFloat64: Tbjson.TYPES.FLOAT64,
			invalidString: Tbjson.TYPES.STRING,
		}
	};

	class B extends A {
		validNullableString = null;
		invalidNonNullableString = null;
	}
	B.tbjson = {
		definition: {
			validNullableString: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.STRING],
			invalidNonNullableString: Tbjson.TYPES.STRING
		}
	};

	class C {
		invalidNullaleFloat64 = 'a';
	}
	C.tbjson = {
		definition: {
			invalidNullaleFloat64: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.FLOAT64]
		}
	};

	class D {
		b = new B();
		array = [new C(), new C()];
		object = {
			[1]: new C(),
			[2]: new C()
		};
		mixed = [new C(), new C()];
		nested = {
			a: new C(),
			b: new C()
		};
	}
	D.tbjson = {
		definition: {
			b: B,
			array: [Tbjson.TYPES.ARRAY, C],
			object: [Tbjson.TYPES.OBJECT, C],
			mixed: [C, C],
			nested: {
				a: C,
				b: C
			}
		}
	};

	let x = new D();

	return [
		stringify(Tbjson.validate(x)),
		stringify([
			[['b', 'invalidBool1'], 1],
			[['b', 'invalidBool2'], 1],
			[['b', 'invalidUint8'], 2],
			[['b', 'invalidInt8'], 3],
			[['b', 'invalidUint16'], 4],
			[['b', 'invalidInt16'], 5],
			[['b', 'invalidUint32'], 6],
			[['b', 'invalidInt32'], 7],
			[['b', 'invalidFloat32'], 8],
			[['b', 'invalidFloat64'], 9],
			[['b', 'invalidString'], 10],
			[['b', 'invalidNonNullableString'], 10],
			[['array', 0, 'invalidNullaleFloat64'], 9],
			[['array', 1, 'invalidNullaleFloat64'], 9],
			[['object', '1', 'invalidNullaleFloat64'], 9],
			[['object', '2', 'invalidNullaleFloat64'], 9],
			[['mixed', 0, 'invalidNullaleFloat64'], 9],
			[['mixed', 1, 'invalidNullaleFloat64'], 9],
			[['nested', 'a', 'invalidNullaleFloat64'], 9],
			[['nested', 'b', 'invalidNullaleFloat64'], 9]
		])
	];
}