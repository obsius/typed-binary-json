export default function(Tbjson) {

	class A {
		constructor(i) {
			this.p = { i };
		}
	}
	A.tbjson = {
		definition: {
			p: Tbjson.TYPES.OBJECT
		}
	};

	let tbjson = new Tbjson();

	tbjson.serializeToBuffer([new A(1), new A(2)]);
	tbjson.serializeToBuffer([new A(3)]);

	let own = Object.keys(tbjson.getHeader().objs).length;

	let rows = [];

	for (let i = 0; i < 65537; ++i) {
		rows.push(new A(i));
	}

	let threw = false;

	try {
		new Tbjson().serializeToBuffer(rows);
	} catch (e) {
		threw = /unknown objects/.test(e.message);
	}

	return [
		JSON.stringify([1, true]),
		JSON.stringify([own, threw])
	];
}
