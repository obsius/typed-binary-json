export default function(Tbjson, stringify) {

	class A {
		a = 1;
		b = '1';
		c = false;
	}
	A.tbjson = {
		definition: {
			a: Tbjson.TYPES.INT32,
			b: Tbjson.TYPES.STRING,
			c: Tbjson.TYPES.BOOL,
		}
	};

	class B extends A {
		c = {
			d: []
		};
		e = true;
	}
	B.tbjson = {
		definition: {
			c: Tbjson.TYPES.OBJECT,
			e: Tbjson.TYPES.BOOL
		}
	};

	class C extends B {
		f = 'f';
	}
	C.tbjson = {
		definition: {
			f: Tbjson.TYPES.STRING
		}
	};

	let x = new C();

	return [
		stringify({
			...A.tbjson.definition,
			...B.tbjson.definition,
			...C.tbjson.definition,
		}),
		stringify(Tbjson.definition(x))
	];
}