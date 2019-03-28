export default function(Tbjson, stringify) {

	let tbjson = new Tbjson();

	class A {
		float32 = 100000.666;
		float32 = -999999.999;
		float32 = 1234.56789;
	}
	
	class B extends A {
		bool = false;
		string = 'string';
	}

	let x = {
		b: new B()
	};

	tbjson.registerPrototype({
		prototype: A,
		definition: {
			x: Tbjson.TYPES.FLOAT32,
			z: Tbjson.TYPES.FLOAT32,
			y: Tbjson.TYPES.FLOAT32
		}
	});

	tbjson.registerPrototype({
		prototype: B,
		definition: {
			bool: Tbjson.TYPES.BOOL,
			string: Tbjson.TYPES.STRING
		}
	});

	return [
		stringify(x),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)))
	];
}