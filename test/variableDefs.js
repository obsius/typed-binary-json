export default function(Tbjson, stringify) {

	let tbjson = new Tbjson();

	class A {
		int = 999;
		string = 'string';
		nullString = null;
		array = [10, 10.0001, true, 'apple'];
		object = {
			float: 10.994,
			bool: false
		}
	}
	A.tbjson = {
		definition: [Tbjson.TYPES.VARIABLE_DEF, 'var1']
	};

	class B {
		var1 = null;
	}
	B.tbjson = {
		definition: {
			var1: [Tbjson.TYPES.NULLABLE, 'var1']
		}
	};

	class C {
		a = new A();
		b = new B();
	}

	C.tbjson = {
		definition: {
			a: A,
			b: B
		}
	};

	let x  = new C();

	tbjson.registerPrototype(C);

	tbjson.registerPseduoPrototype('var1', {
		int: Tbjson.TYPES.INT32,
		string: Tbjson.TYPES.STRING,
		nullString: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.STRING],
		array: Tbjson.TYPES.ARRAY,
		object: Tbjson.TYPES.OBJECT
	});

	tbjson.registerVariableDef('var1', {
		int: Tbjson.TYPES.INT32,
		string: Tbjson.TYPES.STRING,
		nullString: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.STRING],
		array: Tbjson.TYPES.ARRAY,
		object: Tbjson.TYPES.OBJECT
	});

	return [
		stringify(x),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)))
	];
}