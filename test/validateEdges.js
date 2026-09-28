export default function(Tbjson) {

	class A {
		constructor() {
			this.m = null;
			this.n = 2147483647;
		}
	}
	A.tbjson = {
		definition: {
			m: [Tbjson.TYPES.OBJECT, Tbjson.TYPES.FLOAT64],
			n: Tbjson.TYPES.INT32
		}
	};

	class B {
		constructor() {
			this.a = 1;
		}
	}
	B.tbjson = {
		definition: {
			a: Tbjson.TYPES.FLOAT64
		},
		validate: (obj) => obj.a == 1 ? [null, 0] : [{ a: 9 }, 1]
	};

	return [
		JSON.stringify([{ m: Tbjson.TYPES.OBJECT }, 1, [null, 0]]),
		JSON.stringify([...Tbjson.validate(new A()), Tbjson.validate(new B())])
	];
}
