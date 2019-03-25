# Typed Binary JSON

Typed Binary JSON or TBJSON, is a binary serialization format that is compatible with JSON. It stores known object prototypes in a JSON header, and serializes the data in a binary format following the header.  
  
TBJSON is useful for serializing known objects, classes, or types, otherwise it will offer little advantage if any in terms of size or performance over JSON.


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
0 | .tbj | States that file type.
4 | uint32 | Size of the JSON header.
8 | JSON | A utf-8 serialized JSON map of the binary data to follow.
x | binary | The binary data.  Always the next byte after the last header byte.

### Header Format

The header contains information necessary to parse the binary data. It is raw JSON and makes it easy to peak at the file and see how the data is structured.

Entry | Meaning
-|-
refs | A simple map that translates known class and object names (either passed in or the object's constructor name).
classes | Definitions for known classes or objects that are referenced in the root definition.
types | Custom primitive types that have been defined for this serialization.
root | The object that was serialized. Contains the definition needed to decode the binary format.


### Reference
```js
import Tbjson from 'typed-binary-json';
const Tbjson = require('typed-binary-json');

let tbjson = new Tbjson();

let serializedToBuffer = tbjson.serializeToBuffer({ a: "a", b: 1, c: true }); // serialize the object
tbjson.parseBuffer(serializedToBuffer); // parse the buffer

// use these to register classes and types
tbjson.registerClass();
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
	ref: 'A', // refer to this class type as "A", defaults to the contructor name if not given (which could have namespace issues)
	def: {
		x: Tbjson.TYPES.FLOAT32,
		y: Tbjson.TYPES.FLOAT32,
		z: Tbjson.TYPES.FLOAT32,
	}
};

class B {
	as = [new A()];
	string = "string";
	bool = false;
	number = 100.5;
}

// make "B" a known class type
B.tbjson = {
	ref: 'B',
	def: {
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

### Classes

### Types


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
-|-
JSON Write | 140 MB | 2,648 ms
TBJSON Write | 37 MB | 1,154 ms
JSON Read | | N/A | 2,073 ms
TBJSON Read | N/A | 1,453 ms


## TODO
- Better stream handling

## Contributing
Feel free to make changes and submit pull requests whenever.


## License
Typed Binary JSON uses the [MIT](https://opensource.org/licenses/MIT) license.