export default function(Tbjson, stringify) {

	let tbjson = new Tbjson();

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

	tbjson.registerPrototype({
		reference: 'A',
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
	});

	let x = new A();

	return [
		stringify(x),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)))
	];
}