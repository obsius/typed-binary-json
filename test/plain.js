export default function(Tbjson, stringify) {

	let tbjson = new Tbjson();

	let x = {
		int: 999,
		string: 'string',
		array: [10, 10.0001, true, 'apple'],
		object: {
			float: 10.994,
			bool: false
		},
		null: null,
		undefined: undefined
	};

	return [
		stringify(x),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)))
	];
}