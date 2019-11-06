export default function(Tbjson, stringify) {

	let tbjson = new Tbjson();

	class A {
		string = 44;
	}
	A.tbjson = {
		definition: {
			string: Tbjson.TYPES.STRING
		},
		unbuild: (obj) => ({
			string: '' + obj.string
		}),
		build: (obj) => {
			obj.string = parseFloat(obj.string)
		}
	};

	let x = new A();

	return [
		stringify(x),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)))
	];
}