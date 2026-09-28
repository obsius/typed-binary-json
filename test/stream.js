import { Writable } from 'stream';

const SIZE = 1048576;

export default function(Tbjson) {

	class A {
		constructor(i) {
			this.s = 'x'.repeat(200);
			this.i = i;
		}
	}
	A.tbjson = {
		definition: {
			s: Tbjson.TYPES.STRING,
			i: Tbjson.TYPES.UINT32
		}
	};

	let rows = [];

	for (let i = 0; i < 40000; ++i) {
		rows.push(new A(i));
	}

	let chunks = [];
	let sink = new Writable({ write(chunk, encoding, next) { chunks.push(Buffer.from(chunk)); next(); } });
	let tbjson = new Tbjson(undefined, undefined, undefined, { bufferSize: SIZE });

	tbjson.serializeToStream(sink, rows);

	let streamed = Buffer.concat([tbjson.getHeaderAsBuffer(), ...chunks]);
	let buffered = new Tbjson().serializeToBuffer(rows);
	let bounded = chunks.every((chunk) => chunk.length <= SIZE + 4);
	let small = new Tbjson(undefined, undefined, undefined, { bufferSize: 16, xFactor: 1.5 }).serializeToBuffer({ s: 'y'.repeat(100) }).length > 100;

	return [
		JSON.stringify([true, true, true]),
		JSON.stringify([streamed.equals(buffered), bounded, small])
	];
}
