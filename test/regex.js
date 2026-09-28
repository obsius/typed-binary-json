export default function(Tbjson) {

	class A {
		constructor(r) {
			this.r = r;
		}
	}
	A.tbjson = {
		definition: {
			r: '@Regex'
		}
	};

	let pattern = new RegExp('caf' + String.fromCharCode(233) + 'x', 'gi');
	let buffer = new Tbjson([new Tbjson.Types.RegexType()]).serializeToBuffer(new A(pattern));

	return [
		String(pattern),
		String(new Tbjson([new Tbjson.Types.RegexType()]).parseBuffer(buffer).r)
	];
}
