import {
	BOOL,
	UINT8,
	INT8,
	UINT16,
	INT16,
	UINT32,
	INT32,
	FLOAT32,
	FLOAT64,
	STRING
} from '../constants';

const MAX_OBJECT_FIELDS_FOR_CODEGEN = 256;

// a string reads inline but writes through the ladder, as its bytes are only known once encoded
const READERS = {
	[BOOL]:    (val) => `${val} = !!bytes[offset++];`,
	[UINT8]:   (val) => `${val} = bytes[offset++];`,
	[INT8]:    (val) => `${val} = view.getInt8(offset); offset += 1;`,
	[UINT16]:  (val) => `${val} = view.getUint16(offset); offset += 2;`,
	[INT16]:   (val) => `${val} = view.getInt16(offset); offset += 2;`,
	[UINT32]:  (val) => `${val} = view.getUint32(offset); offset += 4;`,
	[INT32]:   (val) => `${val} = view.getInt32(offset); offset += 4;`,
	[FLOAT32]: (val) => `${val} = view.getFloat32(offset); offset += 4;`,
	[FLOAT64]: (val) => `${val} = view.getFloat64(offset); offset += 8;`,
	[STRING]:  (val) => `{ let n = bytes[offset]; if (n < 128) { offset += 1; } else if (n < 192) { n = (n & 63) << 8 | bytes[offset + 1]; offset += 2; } else { n = ((n & 63) << 24 | bytes[offset + 1] << 16 | bytes[offset + 2] << 8 | bytes[offset + 3]) >>> 0; offset += 4; } ${val} = bytes.toString(reader.strEncoding, offset, offset + n); offset += n; }`
};

// an integer outside its type throws, as the writer writes do
const WRITERS = {
	[BOOL]:    { size: 1, source: (val) => `bytes[offset++] = R(${val}, 0, 255);` },
	[UINT8]:   { size: 1, source: (val) => `bytes[offset++] = R(${val}, 0, 255);` },
	[INT8]:    { size: 1, source: (val) => `view.setInt8(offset, R(${val}, -128, 127)); offset += 1;` },
	[UINT16]:  { size: 2, source: (val) => `view.setUint16(offset, R(${val}, 0, 65535)); offset += 2;` },
	[INT16]:   { size: 2, source: (val) => `view.setInt16(offset, R(${val}, -32768, 32767)); offset += 2;` },
	[UINT32]:  { size: 4, source: (val) => `view.setUint32(offset, R(${val}, 0, 4294967295)); offset += 4;` },
	[INT32]:   { size: 4, source: (val) => `view.setInt32(offset, R(${val}, -2147483648, 2147483647)); offset += 4;` },
	[FLOAT32]: { size: 4, source: (val) => `view.setFloat32(offset, ${val}); offset += 4;` },
	[FLOAT64]: { size: 8, source: (val) => `view.setFloat64(offset, ${val}); offset += 8;` }
};

const CODEGEN_AVAILABLE = (() => {
	try {
		return new Function('return true')();
	} catch (e) {
		return false;
	}
})();

export default class Codecs {

	#codegen;
	#parseDef;

	#parsers = new WeakMap();
	#serializers = new WeakMap();

	// fields classifies an object definition's fields for generation, each { key, code, nullable, def, parser }
	constructor(codegen, parseDefFn) {
		this.#codegen = CODEGEN_AVAILABLE && codegen;
		this.#parseDef = parseDefFn;
	}

	// whether a primitive code reads inline
	inline(code) {
		return !!READERS[code];
	}

	// the parser for an object definition and the class it builds, its build hook run after
	parser(def, prototype, build) {

		// a definition is nearly always read as one class, so that parser sits first and any other class beside it
		let entry = this.#parsers.get(def);

		if (entry && entry.prototype === prototype) {
			return entry.parser;
		}

		let parser = entry?.others?.get(prototype);

		if (!parser) {

			let fields = this.#parseDef(def);

			parser = (this.#codegen && fields.length <= MAX_OBJECT_FIELDS_FOR_CODEGEN) ? generateParser(fields, prototype, build) : loopParser(def, prototype, build);

			if (!entry) {
				this.#parsers.set(def, { prototype, parser, others: null });
			} else {
				(entry.others || (entry.others = new Map())).set(prototype, parser);
			}
		}

		return parser;
	}

	// the serializer for an object definition
	serializer(def) {

		let serializer = this.#serializers.get(def);

		if (!serializer) {

			let fields = this.#parseDef(def);

			serializer = (this.#codegen && fields.length <= MAX_OBJECT_FIELDS_FOR_CODEGEN) ? generateSerializer(fields) : loopSerializer(def);

			this.#serializers.set(def, serializer);
		}

		return serializer;
	}
}

////////////////////////////////////////////////////////////////

function generateParser(fields, prototype, build) {

	let defs = [];
	let parsers = [];
	let parts = [];
	let temps = [];
	let literal = [];

	for (let i = 0; i < fields.length; ++i) {

		let { key, code, nullable, def, parser } = fields[i];

		let target = prototype ? `obj[${JSON.stringify(key)}]` : `t${i}`;

		let reader = READERS[code]?.(target) ?? (parser ? (
			`reader.offset = offset; ${target} = N[${parsers.push(lazy(parser)) - 1}](parse, reader); offset = reader.offset;`
		) : (
			`reader.offset = offset; ${target} = parse(D[${defs.push(def) - 1}]); offset = reader.offset;`
		));

		parts.push(nullable ? `if (bytes[offset++]) { ${reader} } else { ${target} = null; }` : reader);

		// a plain object gathers its temps for the literal
		if (!prototype) {
			temps.push(target);
			literal.push(`${JSON.stringify(key)}: ${target}`);
		}
	}

	let body;

	if (prototype) {
		body = `const obj = new P(); ${parts.join(' ')} ${build ? 'B(obj);' : ''} reader.offset = offset; return obj;`;
	} else if (!fields.length) {
		body = 'return {};';
	} else {
		body = `let ${temps.join(', ')}; ${parts.join(' ')} reader.offset = offset; return { ${literal.join(', ')} };`;
	}

	return new Function('D', 'N', 'P', 'B', `return (parse, reader) => { const bytes = reader.buffer, view = reader.view; let offset = reader.offset; ${body} };`)(defs, parsers, prototype, build);
}

function generateSerializer(fields) {

	let defs = [];
	let parts = [];
	let sizes = new Array(fields.length);
	let numBytes = 0;

	// the inline bytes of each field, and of all of them together
	for (let i = 0; i < fields.length; ++i) {

		let { code, nullable } = fields[i];

		sizes[i] = (WRITERS[code]?.size ?? 0) + (nullable ? 1 : 0);
		numBytes += sizes[i];
	}

	let numBytesRemaining = numBytes;

	for (let i = 0; i < fields.length; ++i) {

		let { key, code, nullable, def } = fields[i];

		let val = `obj[${JSON.stringify(key)}]`;

		numBytesRemaining -= sizes[i];

		let writer = WRITERS[code]?.source(val) ?? (
			`writer.offset = offset; serialize(${val}, D[${defs.push(def) - 1}]); ${numBytesRemaining ? `writer.checkSize(${numBytesRemaining}); ` : ''}offset = writer.offset; bytes = writer.buffer; view = writer.view;`
		);

		parts.push(nullable ? `if (${val} == null) { bytes[offset++] = 0; } else { bytes[offset++] = 1; ${writer} }` : writer);
	}

	return new Function('D', 'R', `return (serialize, writer, obj) => { writer.checkSize(${numBytes}); let bytes = writer.buffer, view = writer.view, offset = writer.offset; ${parts.join(' ')} writer.offset = offset; };`)(defs, throwRangeError);
}

function loopParser(def, prototype, build) {
	return (parse) => {

		let obj = prototype ? new prototype() : {};

		for (let key in def) {
			obj[key] = parse(def[key]);
		}

		if (build) {
			build(obj);
		}

		return obj;
	};
}

function loopSerializer(def) {
	return (serialize, writer, obj) => {
		for (let key in def) {
			serialize(obj[key], def[key]);
		}
	};
}

function lazy(get) {
	let fn = null;
	return (parse, reader) => (fn || (fn = get()))(parse, reader);
}

function throwRangeError(val, min, max) {

	if (val < min || val > max) {
		throw new RangeError(`The value ${val} is out of range, it must be >= ${min} and <= ${max}`);
	}

	return val;
}
