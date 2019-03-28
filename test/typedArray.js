export default function(Tbjson, stringify) {

	let tbjson = new Tbjson();

	class A {
		uint8 = new Uint8Array(2);
		int8 = new Int8Array(4);
		uint16 = new Uint16Array(6);
		int16 = new Int16Array(9);
		uint32 = new Uint32Array(9);
		int32 = new Int32Array(8);
		float32 = new Float32Array(4);
		float64 = new Float64Array(1);
	
		constructor() {
			fillArray(this.uint8);
			fillArray(this.int8);
			fillArray(this.uint16);
			fillArray(this.int16);
			fillArray(this.uint32);
			fillArray(this.int32);
			fillArray(this.float32);
			fillArray(this.float64);
		}
	}

	tbjson.registerPrototype({
		reference: 'A',
		definition: {
			uint8: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.UINT8],
			int8: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.INT8],
			uint16: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.UINT16],
			int16: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.INT16],
			uint32: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.UINT32],
			int32: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.INT32],
			float32: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.FLOAT32],
			float64: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.FLOAT64]
		}
	});

	let x = {
		a: new A(),
		uint8: new Uint8Array(2),
		int8: new Int8Array(4),
		uint16: new Uint16Array(6),
		int16: new Int16Array(9),
		uint32: new Uint32Array(9),
		int32: new Int32Array(8),
		float32: new Float32Array(4),
		float64: new Float64Array(1)
	};

	return [
		stringify(x),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)))
	];
}

function fillArray(arr) {
	for (let i = 0; i < arr.length; ++i) {
		arr[i] = i;
	}
}