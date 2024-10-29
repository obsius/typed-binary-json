export default function(Tbjson, stringify) {

	class C {
		validInt32 = 0;
		invalidInt32 = 9999999999;
		invalidFloat64Array = [0, true, 2, 'true'];
	}
	C.tbjson = {
		definition: {
			validInt32: Tbjson.TYPES.INT32,
			invalidInt32: Tbjson.TYPES.INT32,
			invalidFloat64Array: [Tbjson.TYPES.ARRAY, Tbjson.TYPES.FLOAT64],
		}
	};

	class B {
		invalidString = 1;
		c = new C();
	}
	B.tbjson = {
		definition: {
			invalidString: Tbjson.TYPES.STRING,
			c: C
		}
	};

	class A {
		validBool = true;
		invalidBool = 'true';
		b = new B();
	}

	A.tbjson = {
		definition: {
			validBool: Tbjson.TYPES.BOOL,
			invalidBool: Tbjson.TYPES.BOOL,
			b: B
		}
	};

	let x = new A();

	return [
		stringify([
			[['invalidBool'], 1],
			[['b', 'invalidString'], 10],
			[['b', 'c', 'invalidInt32'], 7],
			[['b', 'c', 'invalidFloat64Array', '1'], 9],
			[['b', 'c', 'invalidFloat64Array', '3'], 9],
		]),
		stringify(Tbjson.flattenValidation(Tbjson.validate(x)))
	];
}