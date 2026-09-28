export default function(Tbjson) {

	class A {
		constructor(value) {
			this.value = value;
		}
	}
	A.tbjson = {
		definition: {
			value: Tbjson.TYPES.UINT8
		}
	};

	return throws(Tbjson, A, true, 300) && throws(Tbjson, A, false, 300) && throws(Tbjson, A, true, -1) && !throws(Tbjson, A, true, 255) && !throws(Tbjson, A, false, 255) && !throws(Tbjson, A, true, 0);
}

function throws(Tbjson, A, codegen, value) {
	try {

		let tbjson = new Tbjson(undefined, undefined, undefined, { codegen });

		tbjson.registerPrototype(A);
		tbjson.parseBuffer(tbjson.serializeToBuffer(new A(value)));

		return false;

	} catch (e) {
		return true;
	}
}
