export default function(Tbjson, stringify) {

	class A {
		string = 'test';
		num = 33;
		hidden = true
	}
	A.tbjson = {
		definition: {
			string: Tbjson.TYPES.STRING,
			num: Tbjson.TYPES.FLOAT64
		}
	};

	let x = new A();
	delete x.hidden;

	return [
		stringify(x),
		stringify(Tbjson.serialize(new A()))
	];
}