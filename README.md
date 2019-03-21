# Typed Binary JSON

Typed Binary JSON or TBJSON, is a binary serialization format that is compatible with JSON. It stores known object prototypes in a JSON header, and serializes the data in binary following the header.  
  
TBJSON is useful for serializing known object, classes, or types, otherwise it will offer no advantage in terms of size of performance over JSON.


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
8 | JSON | A JSON representation of the binary data to follow.
x | binary | The binary data.  Always the next byte after the last header byte.

### Header Format

The header contains information necessary to parse the binary data. It is raw JSON and makes it easy to peak at the file and see how the data is structured.

Entry | Meaning
-|-
classes | ...
types | ...


### Reference
```js
import Tbjson from 'typed-binary-json';
const Tbjson = require('typed-binary-json');

const tbjson = new Tbjson();

let serialized = tbjson.serialize({ a: "a", b: 1, c: true }); // serialize and object
tbjson.parse(serialized); // parse a string or file or buffer

tbjson.registerClass();
tbjson.registerType();
```

### Working Example
```js
import Tbjson from 'typed-binary-json';
```


## Methods

##### serialize(menu)
Call this with an Electron menu object. Make sure to use the object and not the template (`electron.remote.Menu.buildFromTemplate()` for example).

##### parse(title)
Call this with a title string to set the titlebar's title.


## Performance


## TODO


## Contributing
Feel free to make changes and submit pull requests whenever.


## License
Typed Binary JSON uses the [MIT](https://opensource.org/licenses/MIT) license.