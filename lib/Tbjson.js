'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// stamp for file type
var STAMP = '.tbj';

// types
var NULL = 0;
var BYTE = 1;
var BOOL = 2;
var INT8 = 3;
var UINT8 = 4;
var INT16 = 5;
var UINT16 = 6;
var INT32 = 7;
var UINT32 = 8;
var FLOAT32 = 9;
var FLOAT64 = 10;
var STRING = 11;
var ARRAY = 12;
var OBJECT = 13;
var CUSTOM = 14;

// type sizes
var SIZE_NULL = 1;
var SIZE_BYTE = 1;
var SIZE_BOOL = 1;
var SIZE_INT8 = 1;
var SIZE_UINT8 = 1;
var SIZE_INT16 = 2;
var SIZE_UINT16 = 2;
var SIZE_INT32 = 4;
var SIZE_UINT32 = 4;
var SIZE_FLOAT32 = 4;
var SIZE_FLOAT64 = 8;

var CUSTOM_TYPE_OFFSET = 128;

/**
 * Tbjson
 */

var Tbjson = function () {
	function Tbjson() {
		var types = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
		var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
		(0, _classCallCheck3.default)(this, Tbjson);
		this.classes = {};
		this.types = {};
		this.options = {
			encStringAs: 'utf-8',
			encNumberAs: 'float32',
			bufferSize: 65536
		};


		if (types && types.length) {
			this.registerTypes(types);
		}

		this.options = (0, _extends3.default)({}, this.options, options);
	}

	(0, _createClass3.default)(Tbjson, [{
		key: 'registerType',
		value: function registerType(type) {}
	}, {
		key: 'registerTypes',
		value: function registerTypes(types) {
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = (0, _getIterator3.default)(types), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var obj = _step.value;

					this.registerType(obj);
				}
			} catch (err) {
				_didIteratorError = true;
				_iteratorError = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion && _iterator.return) {
						_iterator.return();
					}
				} finally {
					if (_didIteratorError) {
						throw _iteratorError;
					}
				}
			}
		}
	}, {
		key: 'serialize',
		value: function serialize(stream, obj) {

			// make a buffer
			this.buffer = new DynamicBuffer(stream, this.options.bufferSize);

			// write out the stamp
			this.buffer.write(STRING, STAMP);

			// process the obj
			this.header = this.process(obj);

			// write out the header
			this.buffer.write(STRING, (0, _stringify2.default)(this.header));

			// flush and cleanup
			this.buffer.flush();
			this.buffer = null;
		}
	}, {
		key: 'serializeToFile',
		value: function serializeToFile(filename, obj) {
			var stream = _fs2.default.createWriteStream(filename, 'binary');
			this.serialize(stream, obj);
			stream.end();
		}
	}, {
		key: 'parse',
		value: function parse(stream) {

			var buffer = void 0;

			stream.on('data', function (chunk) {
				console.log(chunk.length);
			});

			stream.on('end', function () {});
		}
	}, {
		key: 'parseFile',
		value: function parseFile(filename) {
			return this.parse(_fs2.default.createReadStream(filename));
		}

		/* private */

	}, {
		key: 'formatDef',
		value: function formatDef(def) {}
	}, {
		key: 'processDef',
		value: function processDef(obj, def) {
			for (var key in def) {
				this.buffer.write(def[key][0], obj[key]);
			}
		}
	}, {
		key: 'process',
		value: function process(obj, def) {
			switch (typeof obj === 'undefined' ? 'undefined' : (0, _typeof3.default)(obj)) {
				case 'boolean':
					this.buffer.write(BOOL, obj);
					return BOOL;

				case 'string':
					this.buffer.write(STRING, obj);
					return [STRING, obj.length];

				case 'number':
					this.buffer.write(FLOAT32, obj);
					return FLOAT32;

				case 'object':
					if (Array.isArray(obj)) {

						var refs = [];

						var _iteratorNormalCompletion2 = true;
						var _didIteratorError2 = false;
						var _iteratorError2 = undefined;

						try {
							for (var _iterator2 = (0, _getIterator3.default)(obj), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
								var item = _step2.value;

								refs.push(this.process(item));
							}
						} catch (err) {
							_didIteratorError2 = true;
							_iteratorError2 = err;
						} finally {
							try {
								if (!_iteratorNormalCompletion2 && _iterator2.return) {
									_iterator2.return();
								}
							} finally {
								if (_didIteratorError2) {
									throw _iteratorError2;
								}
							}
						}

						return refs;
					} else {

						if (obj.constructor && obj.constructor.tbjson) {

							var _ref = obj.constructor.tbjson.ref;
							var _def = obj.constructor.tbjson.def;

							if (!this.classes[_ref]) {
								this.classes[_ref] = this.formatDef(obj.constructor.tbjson.def);
							}

							this.processDef(obj, obj.constructor.tbjson.def);

							return _ref;
						}

						var ref = {};

						for (var key in obj) {
							ref[key] = this.process(obj[key]);
						}

						return ref;
					}
			}
		}
	}]);
	return Tbjson;
}();

/* internal */

exports.default = Tbjson;

var DynamicBuffer = function () {
	function DynamicBuffer(stream) {
		var size = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 16384;
		var xFactor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 2;
		(0, _classCallCheck3.default)(this, DynamicBuffer);


		this.stream = stream;
		this.buffer = Buffer.allocUnsafe(size);
		this.xFactor = 2;

		this.offset = 0;
	}

	(0, _createClass3.default)(DynamicBuffer, [{
		key: 'flush',
		value: function flush() {
			var _this = this;

			this.streamReady = false;

			this.stream.write(this.buffer.slice(0, this.offset), function (rdy) {
				_this.streamReady = true;
			});

			this.offset = 0;
		}
	}, {
		key: 'resize',
		value: function resize() {
			this.buffer = Buffer.concat(this.buffer, Buffer.allocUnsafe(this.size * Math.floor(this.xFactor / 2)));
		}
	}, {
		key: 'checkFlush',
		value: function checkFlush(length) {
			if (this.offset + length > this.size) {
				if (this.streamReady) {
					this.flush();
				} else {
					this.resize();
				}
			}
		}
	}, {
		key: 'write',
		value: function write(type, val) {
			var length = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			switch (type) {
				case NULL:
					this.checkFlush(SIZE_NULL);
					this.buffer.writeByte(0, this.offset++);
					this.offset += SIZE_NULL;
					break;
				case FLOAT32:
					this.checkFlush(SIZE_FLOAT32);
					this.buffer.writeFloatLE(val, this.offset);
					this.offset += 4;
					break;
				case STRING:
					this.checkFlush(val.length);
					this.buffer.write(val, this.offset, val.length, 'utf-8');
					this.offset += val.length;
			}
		}
	}, {
		key: 'size',
		get: function get() {
			return this.buffer.length;
		}
	}]);
	return DynamicBuffer;
}();

/* TESTS */

var tbjson = new Tbjson();

var A = function A() {
	(0, _classCallCheck3.default)(this, A);
	this.x = 12234345.343452;
	this.y = 15234234.124525;
	this.z = 23123231235.14134;
};

A.tbjson = {};

var B = function B() {
	(0, _classCallCheck3.default)(this, B);

	this.as = [];
	for (var i = 0; i < 1000000; ++i) {
		this.as.push(new A());
	}
};

B.tbjson = {
	ref: 'B',
	def: {
		as: [ARRAY, 'A']
	}
};

/*
tbjson.registerClass(A, {
	x: FLOAT32,
	y: FLOAT32,
	z: FLOAT32
});

tbjson.registerClass(B, {
	as: [ARRAY, A]
});
*/

var x = {
	b: new B(),
	c: 'test',
	d: [12, 14, "est"]
};

/*
let x = {
	v: [],
	s: 'hello',
	r: {
		s: 'hello2',
		d: 45
	}
};

for (let i = 0; i < 10; ++i) {
	x.v.push(i);
}*/

console.time();
/*
for (let i = 0; i < x.v.length; ++i) {

}*/

//fs.writeFileSync("test.kk", JSON.stringify(x));

tbjson.serializeToFile('example.tbj', x);

//tbjson.process(x);

//tbjson.parseFile('example.tbj');

//setTimeout(() => {}, 5000);

console.timeEnd();