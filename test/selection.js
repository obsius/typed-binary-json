export default function(Tbjson, stringify) {

	let tbjson = new Tbjson();

	let x = {
		int: 999,
		string: 'string',
		array: [10, 10.0001, true, 'apple'],
		object: {
			float: 10.994,
			bool: false,
			subObject: {
				string: "string",
				bool: true,
				float: 11.001
			}
		},
		null: null,
		undefined: undefined
	};

	return [
		stringify(x.object.subObject),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x), ['object', 'subObject']))
	];
}