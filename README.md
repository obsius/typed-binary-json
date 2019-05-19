# Typed Binary JSON

Typed Binary JSON or TBJSON, is a binary serialization format that is compatible with JSON. It stores known object prototypes in a JSON header, and serializes the data in a binary format following the header.  
  
TBJSON is useful for serializing known objects, classes, or types, otherwise it will offer little advantage if any in terms of size or performance over JSON.  

For a browser compatible version of this package, use [TBJSON in the Browser](https://www.npmjs.com/package/typed-binary-json-browser)


## Format

### File Format

Each file starts off with ".tbj" to singinify that it is a Typed Binary JSON file, followed by a unit32 which is the length of the header.
```
         length of header                 raw binary data
   .tbj                header in JSON             
.  t  b  j  [ uint32 ]  {  .  .  .  }  .  .  d  a  t  a  .  .
0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5  6  7  8  9  0
0                             10                            20
```

Offset | Value | Meaning
-|-|-
0 | .tbj | States the file type.
4 | uint32 | Size of the JSON header.
8 | JSON | A utf-8 serialized JSON map of the binary data to follow.
x | binary | The binary data.  Always the next byte after the last header byte.

### Header Format

The header contains information necessary to parse the binary data. It is raw JSON and makes it easy to peak at the file and see how the data is structured.

Entry | Meaning
-|-
typeRefs | A map that translates known type names to their codes.
types | Custom primitive types that have been defined for this serialization.
protoRefs | A map that translates known class and object names (either passed in or the object's constructor name) to their codes.
protos | Definitions for known prototypes or classes that are referenced in the root definition.
objs | Definitions for unknown objects that are referenced in known prototypes.
root | The object that was serialized. Contains the definition needed to decode the binary format.

### Types

The types used by TBJSON.

Type | Code | Definition
-|-|-
Primitives |-|-
NULL | 0 | Null value.
BOOL | 1 | Boolean.
UINT8 | 2 | 8 bit unsigned integer.
INT8 | 3 | 8 bit signed integer.
UINT16 | 4 | 16 bit unsigned integer.
INT16 | 5 | 16 bit signed integer.
UINT32 | 6 | 32 bit unsigned integer.
INT32 | 7 | 32 bit signed integer.
FLOAT32 | 8 | 32 bit floating point.
FLOAT64 | 9 | 64 bit double precision floating point.
Complex Types |-|-
STRING | 10 | String.
ARRAY | 11 | Array. Used like `[Tbjson.TYPES.ARRAY, <TYPE>]`. Example: `x: [Tbjson.TYPES.ARRAY, MyClass]`.
OBJECT | 12 | Object. Used like `Tbjson.TYPES.OBJECT` or `[Tbjson.TYPES.OBJECT, <TYPE>]` if all the values in the object are the same type. Example: `x: [Tbjson.TYPES.OBJECT, MyClass]`.
NULLABLE | 13 | Nullable value,  Used like `[Tbjson.TYPES.NULLABLE, <TYPE>]`. Example: `x: [Tbjson.TYPES.NULLABLE, Tbjson.TYPES.STRING]`.
TYPED_ARRAY | 14 | Typed array like Float32Array or Int16Array. Used like `[Tbjson.TYPES.TYPED_ARRAY, <TYPE>`. Example: `x: [Tbjson.TYPES.TYPED_ARRAY, Tbjson.TYPES.INT32]`.
UNKNOWN | 15 | Unknown type. Wildcard that can represent a JS number, boolean, or string.

### Reference
```js
import Tbjson from 'typed-binary-json';
const Tbjson = require('typed-binary-json');

let tbjson = new Tbjson();

let serializedToBuffer = tbjson.serializeToBuffer({ a: 'a', b: 1, c: true }); // serialize the object
tbjson.parseBuffer(serializedToBuffer); // parse the buffer

// use these to register classes and types
tbjson.registerPrototype();
tbjson.registerType();
```

### Working Example
```js
import Tbjson from 'typed-binary-json';

class A {
	x = 0;
	y = 0;
	z = 0;
}

// make "A" a known class type
A.tbjson = {
	reference: 'A', // refer to this class type as "A", defaults to the contructor name if not given (which could have namespace issues)
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

// make "B" a known class type
B.tbjson = {
	definition: {
		as: [Tbjson.TYPES.ARRAY, 'A'], // use the [ array, type ] notation to say that "B.as" is an array of "A"
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

##### serializeToBuffer(obj)
Serialize `obj`, create a buffer and write to it.

##### serializeToStream(stream, obj)
Serialize `obj` and write to `stream`.

##### serializeToFile(filename, obj)
Serialize `obj`, create a write stream for `filename`, and write out to the file stream.

### Parsing

##### parseBuffer(buffer)
Parse the `buffer`. Returns the parsed object.

##### parseStream(stream)
Parse the `stream`. Returns the parsed object.

##### parseFileAsBuffer(filename)
Read the whole file `filename` into memory and parse its conents. Preferred for performance. Returns the parsed object.

##### parseFileAsStream(filename)
Create a read stream for `filename` and parse its contents. Useful for very large files, but slower. Returns the parsed object.

### Prototypes

#### registerPrototype(obj)
Register a prototype. `obj` is the definition for the prototype.

#### registerPrototypeRecur(obj)
Register a prototype and then walk it's definition and register those prototypes. `obj` is the definition for the prototype.

### Types

#### registerType(obj)
Register a custom type (a primitive, like int48, etc...). `obj` is the definition for the custom type.

### Static

#### cast(obj, prototype)
Cast the given obj as the prototype.

## Performance
Performance varies on the data type, but you'll get best performance if your types have lots of numeric values, and even better performance if you can take advantage of `float32`, `int32`, `int16`, and `int8` to save space.  
Tested on a SSD, 16 GB, and a E3-1505M @ 2.8 GHz machine.  
  
100 of `root.first`  
10K per each `root.first` of `root.second`

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

Benchmark | Filesize | Time
-|-|-
JSON Write | 140 MB | 2,648 ms
TBJSON Write | 37 MB | 1,154 ms
JSON Read | N/A | 2,073 ms
TBJSON Read | N/A | 1,453 ms


## TODO
- Better stream handling
- Finish implementing custom types

## Contributing
Feel free to make changes and submit pull requests whenever.


## License
Typed Binary JSON uses the [MIT](https://opensource.org/licenses/MIT) license.