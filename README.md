# Typed Binary JSON

Typed Binary JSON or TBJSON, is a binary serialization format that is compatible with JSON.
It stores known object prototypes in a JSON header, and serializes the data in a binary format following the header.  
  
TBJSON is useful for serializing known objects, classes, or types, otherwise it will offer little advantage if any in terms of size or performance over JSON.  

For a browser compatible version of this package, use [TBJSON in the Browser](https://www.npmjs.com/package/typed-binary-json-browser).

## Format

### File Format

Each file starts off with `.tbj` to singinify that it is a `Typed Binary JSON` file, followed by a `unit32` which is the length of the header.
```
         length of header                 raw binary data
   .tbj                header in JSON             
.  t  b  j  [ uint32 ]  {  .  .  .  }  .  .  d  a  t  a  .  .
0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5  6  7  8  9  0
0                             10                            20
```

Offset | Value  | Meaning
---    | ---    | ---
0      | .tbj   | States the file type.
4      | uint32 | Size of the JSON header.
8      | JSON   | A utf-8 serialized JSON map of the binary data to follow.
x      | binary | The binary data. Always the next byte after the last header byte.

### Header Format

The header contains information necessary to parse the binary data. It is raw `JSON` and makes it easy to peak at the file and see how the data is structured.

Entry     | Meaning
---       | ---
typeRefs  | A map that translates known type names to their codes.
types     | Custom primitive types that have been defined for this serialization.
protoRefs | A map that translates known class and object names (either passed in or the object's constructor name) to their codes.
protos    | Definitions for known prototypes or classes that are referenced in the root definition.
objs      | Definitions for unknown objects that are referenced in known prototypes.
root      | The object that was serialized. Contains the definition needed to decode the binary format.

### Types

The types used by TBJSON.

Type          | Code | Definition
---           | ---  | ---
Primitives    | -    | -
NULL          | 0    | Null value.
BOOL          | 1    | Boolean.
UINT8         | 2    | 8 bit unsigned integer.
INT8          | 3    | 8 bit signed integer.
UINT16        | 4    | 16 bit unsigned integer.
INT16         | 5    | 16 bit signed integer.
UINT32        | 6    | 32 bit unsigned integer.
INT32         | 7    | 32 bit signed integer.
FLOAT32       | 8    | 32 bit floating point.
FLOAT64       | 9    | 64 bit double precision floating point.
Complex Types | -    | -
STRING        | 10   | String.
ARRAY         | 11   | Array. Used as `Tbjson.TYPES.ARRAY` or `[Tbjson.TYPES.ARRAY, <TYPE>]`. Like: `[Tbjson.TYPES.ARRAY, Tbjson.TYPES.FLOAT32]`.
OBJECT        | 12   | Object. Used as `Tbjson.TYPES.OBJECT` or `[Tbjson.TYPES.OBJECT, <TYPE>]` if all the values in the object are the same type. Like: `[Tbjson.TYPES.OBJECT, MyClass]`.
NULLABLE      | 13   | Nullable value. Used as `[Tbjson.TYPES.NULLABLE, <TYPE>]`. Like: `[Tbjson.TYPES.NULLABLE, Tbjson.TYPES.STRING]`.
TYPED_ARRAY   | 14   | Typed array. Used as `Float32Array` or `Int16Array`. Used like `[Tbjson.TYPES.TYPED_ARRAY, <TYPE>`. Like: `[Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.INT32]`.
UNKNOWN       | 15   | Unknown type. Wildcard that can represent a JS number, boolean, or string.
Extras        | -    | -
VARIABLE_DEF  | 16   | A variable definition. That is a definition that is not yet known, but will be known just before serialization. Registered by `tbjson.registerVariableDef('var1', { ... })`. Used as `Tbjson.TYPES.VARIABLE_DEF`.
INSTANCE      | 17   | An instance of a class. Useful for subclasses. Like `[Tbjson.TYPES.INSTANCE, MySuperClass]`.

### Reference

```js
// use an import
import Tbjson from 'typed-binary-json';
// or require
const Tbjson = require('typed-binary-json');

// make a new instance
let tbjson = new Tbjson();

// serialize a plain object to a buffer
let serializedToBuffer = tbjson.serializeToBuffer({ a: 'a', b: 1, c: true });

// buffer looks like:
//
// byte offset: data
//
// 000: .tbj
// 004: (uint32)12
// 008: {
//        "version": 1,
//        "offsets": {
//          "prototype": 64,
//          "nullablePrototype": 256,
//          "array": 512,
//          "object": 4096
//        },
//        "typeRefs": {},
//        "typeDefs": {},
//        "protoRefs": {},
//        "protoDefs": {},
//        "objs": {},
//        "root": {
//          "a": 10,
//          "b": 9,
//          "c": 1
//        }
//      }
// 194: binary data

// parse a buffer (deserialize)
tbjson.parseBuffer(serializedToBuffer);

class Test {
	constructor() {
		this.x = [0, 1, 2, 3, 4, 5, 6, 7, 8];
	}
}
Test.tbjson = {
	definition: {
		x: [Tbjson.TYPES.ARRAY, Tbjson.TYPES.UINT32]
	}
}; 

// serialize a prototyped object to a buffer
serializedToBuffer = tbjson.serializeToBuffer(new Test());

// buffer looks like:
//
// byte offset: data
//
// 000: .tbj
// 004: (uint32)12
// 008: {
//        "version": 1,
//        "offsets": {
//          "prototype": 64,
//          "nullablePrototype": 256,
//          "array": 512,
//          "object": 4096
//        },
//        "typeRefs": {},
//        "typeDefs": {},
//        "protoRefs": {
//          "Test": 64
//        },
//        "protoDefs": {
//          "64": {
//            "x": 518
//          }
//        },
//        "objs": {},
//        "root": 64
//      }
// 199: binary data

```

### Working Example

Refer to the `test` dir to see all possible examples.

```js
import Tbjson from 'typed-binary-json';

class A {
	x = 0;
	y = 0;
	z = 0;
}

// make A a known prototype
A.tbjson = {
	definition: {
		x: Tbjson.TYPES.FLOAT32,
		y: Tbjson.TYPES.FLOAT32,
		z: Tbjson.TYPES.FLOAT32,
	}
};

class B {
	as = [new A()];
	string = 'string';
	bool = false;
	number = 100.5;
}

// make B a known prototype
B.tbjson = {
	definition: {
		// use the [ array, type ] notation to say that "B.as" is an array of A
		as: [Tbjson.TYPES.ARRAY, A],
		string: Tbjson.TYPES.STRING,
		bool: Tbjson.TYPES.BOOL,
		number: Tbjson.TYPES.FLOAT64
	}
}

// make a root object (untyped)
let root = {
	b: new B()
};

(async function() {

	let tbjson = new Tbjson();

	// serialize to a file
	await tbjson.serializeToFile('test.tbj', root);

	// parse from a file
	let obj = tbjson.parseFileAsBuffer('test.tbj');

	console.log(obj);
})();
```

## Methods

### Serialization

**serializeToBuffer(obj)**

Serialize `obj`. Create a buffer and write to it.

**serializeToStream(stream, obj)**

Serialize `obj`. Write to `stream`.

**serializeToFile(filename, obj)**

Serialize `obj`. Create a write stream for `filename` and write out to the file stream.

### Parsing

**parseBuffer(buffer)**

Parse the `buffer`. Return the parsed object.

**parseStream(stream)**

Parse the `stream`. Return the parsed object.

**parseFileAsBuffer(filename)**

Read the file `filename` into memory and parse its conents. Preferred for performance. Return the parsed object.

**parseFileAsStream(filename)**

Create a read stream for `filename` and parse its contents. Useful for very large files, but slower. Return the parsed object.

### Registrations

Most of these functions are not necessary to call if `tbjson` is set on the class level.

**finalizePrototypes()**

*See `test/inheritance` for an example.*

Must be called if inheritance or referenced definitions are used or registered.

```js
let tbson = new Tbjson();
tbjson.registerPrototype({
	reference: 'X',
	definition: {
		x: Tbjson.TYPES.STRING
	}
});
```

**registerPrototype(obj)**

*See `test/type` and `test/inheritance` for examples.*

*Not needed if tbjson is set statically on a class.*

Register a prototype. `obj` is the definition for the prototype.

```js
let tbson = new Tbjson();
tbjson.registerPrototype({
	prototype: X,
	definition: {
		x: Tbjson.TYPES.STRING
	}
});
```

**registerPrototypes(array)**

Register an array of prototypes. `array` is an array of prototypes.

**registerPseudoPrototype(id, def)**

Register a pseudo prototype. That is a plain (non-prototyped) object that will have a known structure just before serialization.
`id` is a number of string to identify the definition. `ref` is the definition. Can be qualified, like marked `nullable`.

```js
let tbjson = new Tbjson();
tbjson.registerPseudoPrototype('x', {
	x: Tbjson.TYPES.STRING
});

class X {
	constructor() {
		this.x = null;
	}
}
X.tbjson = {
	definition: {
		x: [Tbjson.TYPES.NULLABLE, 'x']
	}
};
```

**registerVariableDef(id, def)**

Register a variable definition. That is a plain (non-prototyped) object that will have a known structure just before serialization. `id` is a number or string to identify the definition. `ref` is the definition. Unlike a pseduo prototype, this cannot be qualified - like marked `nullable`.

```js
let tbjson = new Tbjson();
tbjson.registerVariableDef('x', {
	x: Tbjson.TYPES.STRING
});

class X {
	constructor() {
		this.x = {
			x: 'x'
		};
	}
}
X.tbjson = {
	definition: {
		x: [Tbjson.TYPES.VARIABLE_DEF, 'x']
	}
};
```

**registerType(type)**

Not available yet. Register a custom type (a primitive like `int48`, etc...). `type` is the definition for the custom type.

### Static

**cast(obj, prototype)**

*See `test/cast` and `test/protoypeCast` for examples.*

Cast the given `obj` as `prototype`.

```js
class X {}
X.tbjson = {
	definition: {
		x: Tbjson.TYPES.STRING
	}
};
Tbjson.cast({ x: 'x' }, X);
```

**clone(obj)**

*See `test/clone` for an example.*

Clone the `obj` into a prototyped object ignoring typing rules, but obeying which properties should be ignored.

```js
class X {}
let cloneX = Tbjson.clone(x);
```

**definition(obj)**

*See `test/definition` for an example.*

Helper function to extract the definition (including parent prototypes) of `obj`.

```js
class Y {}
y.tbjson = {
	definition: {
		a: Tbjson.TYPES.STRING
	}
};
class X extends Y {}
X.tbjson = {
	definition: {
		b: Tbjson.TYPES.STRING
	}
};

Tbjson.definition(x);
// { a: 'a', b: 'b' }
```

**serialize(obj)**

*See `test/serialize` for an example.*

Serialize `obj` into a plain object ignoring typings, but obeying which properties should be ignored.

```js
class X {
	constriuctor() {
		this.a = 'a';
		this.b = 'b';
	}
}
X.tbjson = {
	definition: {
		a: Tbjson.TYPES.STRING
	}
};

let x = new X();

Tbjson.serialize(x);
// x.b is ignored because it is not part of the tbjson definition
// {  a: 'a' }
```

## Performance

Performance varies on the data type, but you'll get best performance if your types have lots of numeric values, and even better performance if you can take advantage of `float32`, `int32`, `int16`, and `int8` to save space.  
  
100 of `root.first`  
10K per each `root.first` of `first.second`

```json
{
	"root": {
		"first": [{
			"second": [{
				"x": 100000.666666666666,
				"y": -999999.999,
				"z": 1234.5678901234,
				"details": {
					"alpha": "oranges",
					"beta": 10,
					"gamma": [-3.14159, false, true, "!@#$%^&*()"]
				}
			}],
			"anotherString": "apples",
			"number": 86,
			"bool": true,
			"array": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
		}]
	}
}
```

Benchmark    | Filesize | Time
---          | ---      | ---
JSON Write   | 140 MB   | 2,648 ms
TBJSON Write | 37 MB    | 1,154 ms
JSON Read    | N/A      | 2,073 ms
TBJSON Read  | N/A      | 1,453 ms

## Contributing

Feel free to make changes and submit pull requests whenever.

## License

Typed Binary JSON uses the [MIT](https://opensource.org/licenses/MIT) license.