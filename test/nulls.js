export default function(Tbjson, stringify) {

	let tbjson = new Tbjson([], [{
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
			string: Tbjson.TYPES.STRING
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
	}

	let x = new A();

	let res = stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)));

	// set nulls to default
	x.bool = false;
	x.uint8 = 0;
	x.int8 = 0;
	x.uint16 = 0;
	x.int16 = 0;
	x.uint32 = 0;
	x.int32 = 0;
	x.float32 = 0;
	x.float64 = 0;
	x.string = '';

	return [
		stringify(x),
		res
	];
}