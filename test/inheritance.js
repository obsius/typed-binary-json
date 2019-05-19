export default function(Tbjson, stringify) {

	let tbjson = new Tbjson();

	class A {
		x = 10000.666;
		y = -9999.999;
		z = 1234.5678;
	}
	
	class B extends A {
		bool = false;
		string = 'string';
	}

	class C extends A {
		b = new B();
	}
	C.tbjson = {
		definition: {
			b: B
		}
	};

	let x = {
		b: new B()
	};

	tbjson.registerPrototype({
		prototype: A,
		definition: {
			x: Tbjson.TYPES.FLOAT32,
			y: Tbjson.TYPES.FLOAT32,
			z: Tbjson.TYPES.FLOAT32
		}
	});

	tbjson.registerPrototype({
		prototype: B,
		definition: {
			bool: Tbjson.TYPES.BOOL,
			string: Tbjson.TYPES.STRING
		}
	});

	tbjson.finalizePrototypes();

	return [
		stringify(x),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)))
	];
}