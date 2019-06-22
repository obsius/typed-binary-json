export default function(Tbjson, stringify) {

	let tbjson = new Tbjson();

	class A {
		int = 999;
		string = 'string';
		array = [10, 10.0001, true, 'apple'];
		object = {
			float: 10.994,
			bool: false
		}
	}

	A.tbjson = {
		definition: [Tbjson.TYPES.VARIABLE_DEF, 'var1']
	};

	let x  = new A();

	tbjson.registerPrototype(A);

	tbjson.registerVariableDef('var1', {
		int: Tbjson.TYPES.INT32,
		string: Tbjson.TYPES.STRING,
		array: Tbjson.TYPES.ARRAY,
		object: Tbjson.TYPES.OBJECT
	});

	tbjson.processVariableDefs();

	return [
		stringify(x),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)))
	];
}