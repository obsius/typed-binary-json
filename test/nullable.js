export default function(Tbjson, stringify) {

	class A {
		str = 'hello';
		number = 100;
	}

	A.tbjson = {
		definition: {
			str: Tbjson.TYPES.STRING,
			number: Tbjson.TYPES.FLOAT32
		}
	};

	let tbjson = new Tbjson([], [{
		reference: 'B',
		definition: {
			bool: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.BOOL],
			uint8: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.UINT8],
			int8: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.INT8],
			uint16: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.UINT16],
			int16: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.INT16],
			uint32: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.UINT32],
			int32: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.INT32],
			float32: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.FLOAT32],
			float64: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.FLOAT64],
			string: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.STRING],
			array: [
				[Tbjson.TYPES.NULLABLE, Tbjson.TYPES.BOOL],
				[Tbjson.TYPES.NULLABLE, Tbjson.TYPES.INT32],
				[Tbjson.TYPES.NULLABLE, Tbjson.TYPES.FLOAT64]
			],
			arrayNull: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.ARRAY],
			obj: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.OBJECT],
			objNull: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.OBJECT],
			a: [Tbjson.TYPES.NULLABLE, A],
			aNull: [Tbjson.TYPES.NULLABLE, A]
		}
	}]);

	class B {
		bool = null;
		uint8 = null;
		int8 = null;
		uint16 = null;
		int16 = null;
		uint32 = null;
		int32 = null;
		float32 = null;
		float64 = null;
		string = null;
		array = [true, 3200000, 9999.123456789];
		arrayNull = null;
		obj = { a: 'a' };
		objNull = null;
		a = new A();
		aNull = null;
	}

	let x = new B();

	return [
		stringify(x),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)))
	];
}