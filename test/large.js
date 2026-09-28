export default function(Tbjson, stringify) {

	let tbjson = new Tbjson();

	class A {
		uint8 = 255;
		string = 'string';
	}
	A.tbjson = {
		definition: {
			uint8: Tbjson.TYPES.UINT8,
			string: Tbjson.TYPES.STRING
		}
	};

	let x = {
		as: [],
		plain: [],
		mixed: [],
		wide: {}
	};

	for (let i = 0; i < 1000; ++i) {
		x.as.push(new A());
		x.plain.push({ i, label: 'label-' + i, half: i / 2 });
		x.mixed.push(i % 2 ? 'odd' : i);
		x.wide['key-' + i] = i % 3 ? i : 'string-' + i;
	}

	return [
		stringify(x),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)))
	];
}
