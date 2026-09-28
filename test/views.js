export default function(Tbjson) {

	let tbjson = new Tbjson();

	class A {
		constructor() {
			let all = new Float32Array([1, 2, 3, 4, 5, 6]);
			this.view = all.subarray(2, 4);
			this.offset = new Uint8Array(all.buffer, 8, 4);
			this.unknown = null;
		}
	}
	A.tbjson = {
		definition: {
			view: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.FLOAT32],
			offset: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.UINT8],
			unknown: Tbjson.TYPES.UNKNOWN
		}
	};

	let x = new A();
	let retX = tbjson.parseBuffer(tbjson.serializeToBuffer(x));

	return [
		JSON.stringify([Array.from(x.view), Array.from(x.offset), x.unknown]),
		JSON.stringify([Array.from(retX.view), Array.from(retX.offset), retX.unknown])
	];
}
