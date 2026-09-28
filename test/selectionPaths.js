export default function(Tbjson, stringify) {

	class A {
		constructor(x = 0, y = 0) {
			this.x = x;
			this.y = y;
		}
	}
	A.tbjson = {
		definition: {
			x: Tbjson.TYPES.FLOAT32,
			y: Tbjson.TYPES.FLOAT32
		}
	};

	class B {
		constructor() {
			this.name = 'b';
			this.origin = new A(1, 2);
			this.fixed = [true, -7, 2.5];
			this.nullableA = new A(3, 4);
			this.nullableNull = null;
			this.rows = [new A(5, 6), new A(7, 8)];
			this.words = ['a', 'bb', 'ccc'];
			this.plain = { a: 1, b: 'x', inner: { c: 2, d: [1, 2, 3] } };
			this.tail = 42;
		}
	}
	B.tbjson = {
		definition: {
			name: Tbjson.TYPES.STRING,
			origin: A,
			fixed: [Tbjson.TYPES.BOOL, Tbjson.TYPES.INT32, Tbjson.TYPES.FLOAT64],
			nullableA: [Tbjson.TYPES.NULLABLE, A],
			nullableNull: [Tbjson.TYPES.NULLABLE, A],
			rows: [Tbjson.TYPES.ARRAY, A],
			words: [Tbjson.TYPES.ARRAY, Tbjson.TYPES.STRING],
			plain: Tbjson.TYPES.OBJECT,
			tail: Tbjson.TYPES.UINT8
		}
	};

	let make = () => {
		let tbjson = new Tbjson();
		tbjson.registerPrototype(A);
		tbjson.registerPrototype(B);
		return tbjson;
	};

	let root = { b: new B(), list: [1, 'two', new A(3, 4)], last: 'end' };
	let buffer = make().serializeToBuffer(root);
	let full = make().parseBuffer(buffer);

	let selectors = [
		['b', 'name'], ['b', 'origin', 'y'], ['b', 'fixed', 1], ['b', 'fixed', '0'],
		['b', 'nullableA', 'x'], ['b', 'nullableNull'], ['b', 'nullableNull', 'x'],
		['b', 'rows'], ['b', 'words'], ['b', 'plain', 'inner', 'c'], ['b', 'plain', 'inner', 'd'], ['b', 'tail'], ['b', 'missing'],
		['list', 1], ['list', 2, 'y'], ['last']
	];

	let expected = selectors.map((selector) => selector.reduce((obj, key) => obj?.[key], full) ?? null);
	let selected = selectors.map((selector) => make().parseBuffer(buffer, selector));

	return [
		stringify(expected),
		stringify(selected)
	];
}
