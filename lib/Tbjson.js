'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

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

var BYTE = 0;
var BOOL = 1;
var UINT = 2;
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

var SIZES = {
	FLOAT32: 4
};

/**
 * Tbjson
 */

var Tbjson = function () {
	function Tbjson() {
		var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
		    _ref$classes = _ref.classes,
		    classes = _ref$classes === undefined ? [] : _ref$classes,
		    _ref$types = _ref.types,
		    types = _ref$types === undefined ? [] : _ref$types,
		    _ref$options = _ref.options,
		    options = _ref$options === undefined ? {} : _ref$options;

		(0, _classCallCheck3.default)(this, Tbjson);
		this.classes = {};
		this.types = {};
		this.options = {
			encStringAs: 'utf-8',
			encNumberAs: 'float32',
			bufferSize: 65536
		};


		if (classes && classes.length) {
			this.registerClasses(classes);
		}

		if (types && types.length) {
			this.registerTypes(types);
		}

		this.options = (0, _extends3.default)({}, this.options, options);
	}

	(0, _createClass3.default)(Tbjson, [{
		key: 'registerClass',
		value: function registerClass(obj) {}
	}, {
		key: 'registerClasses',
		value: function registerClasses(classes) {
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = (0, _getIterator3.default)(classes), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var obj = _step.value;

					this.registerClass(obj);
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
		key: 'registerType',
		value: function registerType(type) {}
	}, {
		key: 'registerTypes',
		value: function registerTypes(types) {
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = (0, _getIterator3.default)(types), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var obj = _step2.value;

					this.registerType(obj);
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
		}
	}, {
		key: 'serialize',
		value: function serialize(stream, obj) {
			var buffer = new DynamicBuffer(stream, 65563);
			this.process(buffer, obj);
			buffer.flush();
		}
	}, {
		key: 'serializeToFile',
		value: function serializeToFile(filename, obj) {
			var stream = _fs2.default.createWriteStream(filename, 'binary');
			console.log(stream);
			this.serialize(stream, obj);
			stream.end();
		}
	}, {
		key: 'parse',
		value: function parse(stream) {

			var buffer = void 0;

			stream.on('data', function (chunk) {
				console.log(chunk);
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
		key: 'process',
		value: function process(buffer, obj) {
			if (this.classes[obj.constructor]) {}

			for (var key in obj) {
				switch ((0, _typeof3.default)(obj[key])) {
					case 'string':
					case 'number':
						buffer.write(FLOAT32, obj[key]);
						return;
					case 'object':
						this.serialize(stream, obj);
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
		var size = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1024;
		var xFactor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 2;
		(0, _classCallCheck3.default)(this, DynamicBuffer);


		this.stream = stream;
		this.buffer = Buffer.alloc(size);
		this.xFactor = 2;

		this.offset = 0;
	}

	(0, _createClass3.default)(DynamicBuffer, [{
		key: 'flush',
		value: function flush() {
			this.stream.write(this.buffer);
			this.offset = 0;
		}
	}, {
		key: 'resize',
		value: function resize() {
			this.buffer = Buffer.concat(this.buffer, Buffer.alloc(this.size * Math.floor(this.xFactor / 2)));
		}
	}, {
		key: 'write',
		value: function write(type, val) {
			var length = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

			if (this.offset + SIZES[type] > this.size) {
				this.flush();
			}

			this.buffer.writeFloatLE(val, this.offset);

			this.offset += SIZES[type];
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

var x = {
	v: []
};

for (var i = 0; i < 1000; ++i) {
	x.v.push(i);
}

tbjson.serializeToFile('example.tbj', x);