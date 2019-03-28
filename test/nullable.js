export default function(Tbjson, stringify) {

	let tbjson = new Tbjson([], [{
		reference: 'A',
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
			]
		}
	}]);

	class A {
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
	}

	let x = new A();

	return [
		stringify(x),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)))
	];
}