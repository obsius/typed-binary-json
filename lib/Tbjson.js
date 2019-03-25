'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

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

var _constants = require('./constants');

var _BufferReader = require('./BufferReader');

var _BufferReader2 = _interopRequireDefault(_BufferReader);

var _StreamBufferWriter = require('./StreamBufferWriter');

var _StreamBufferWriter2 = _interopRequireDefault(_StreamBufferWriter);

var _StreamBufferReader = require('./StreamBufferReader');

var _StreamBufferReader2 = _interopRequireDefault(_StreamBufferReader);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// defaults
var DEFAULT_STR_ENCODING = 'utf-8';
var DEFAULT_NUM_ENCODING = _constants.FLOAT64;
var DEFAULT_BUFFER_SIZE = 1048576;

/**
 * Tbjson
 */

var Tbjson = function () {
	function Tbjson() {
		var types = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
		var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
		(0, _classCallCheck3.default)(this, Tbjson);
		this.refs = {};
		this.classes = {};
		this.types = {};
		this.nextTypeCode = _constants.TYPE_OFFSET;
		this.nextClassCode = _constants.CLASS_OFFSET;
		this.options = {
			encStringAs: DEFAULT_STR_ENCODING,
			encNumberAs: DEFAULT_NUM_ENCODING,
			bufferSize: DEFAULT_BUFFER_SIZE
		};


		if (types && types.length) {
			this.registerTypes(types);
		}

		this.options = (0, _extends3.default)({}, this.options, options);
	}

	(0, _createClass3.default)(Tbjson, [{
		key: 'registerConstructor',
		value: function registerConstructor(c) {}
	}, {
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
		key: 'serializeToStream',
		value: function serializeToStream(stream, obj) {

			// make a writer
			this.writer = new _StreamBufferWriter2.default(stream, this.options.bufferSize);

			// process the obj
			this.header = {
				refs: this.refs,
				classes: this.classes,
				root: this.serialize(obj)
			};

			// flush and cleanup
			this.writer.flush();
			this.writer = null;
		}
	}, {
		key: 'serializeToFile',
		value: function serializeToFile(filename, obj) {
			var _this = this;

			return new _promise2.default(function (res, rej) {
				try {
					var tempFilename = filename + '.tmp';

					// write the data to a tmp file
					var writeStream = _fs2.default.createWriteStream(tempFilename, 'binary');
					_this.serializeToStream(writeStream, obj);
					writeStream.end();

					// write the final file
					writeStream = _fs2.default.createWriteStream(filename, 'binary');

					var headerString = (0, _stringify2.default)(_this.header);

					var headerLengthBuffer = Buffer.allocUnsafe(4);
					headerLengthBuffer.writeUInt32LE(headerString.length);

					// write out the magic number, header length, and header
					writeStream.write(_constants.MAGIC_NUMBER, 'utf-8');
					writeStream.write(headerLengthBuffer);
					writeStream.write(headerString, 'utf-8');

					// pipe the tmp file to the final file
					var readStream = _fs2.default.createReadStream(tempFilename, 'binary');
					readStream.pipe(writeStream);

					readStream.on('end', function () {

						// cleanup
						_fs2.default.unlinkSync(tempFilename);

						res();
					});
				} catch (e) {
					rej(new Error('Tbjson Failed to serialize object to "' + filename + ': ' + e));
				}
			});
		}
	}, {
		key: 'parseStream',
		value: function parseStream(stream) {
			var _this2 = this;

			return new _promise2.default(function () {
				var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(res, rej) {
					var headerLength, header;
					return _regenerator2.default.wrap(function _callee$(_context) {
						while (1) {
							switch (_context.prev = _context.next) {
								case 0:

									_this2.reader = new _StreamBufferReader2.default(stream);

									// validate the stream type
									_context.next = 3;
									return _this2.reader.read(_constants.STRING, _constants.SIZE_MAGIC_NUMBER);

								case 3:
									_context.t0 = _context.sent;
									_context.t1 = _constants.MAGIC_NUMBER;

									if (!(_context.t0 != _context.t1)) {
										_context.next = 7;
										break;
									}

									rej(new Error('Stream is not a Typed Binary JSON format'));

								case 7:
									_context.next = 9;
									return _this2.reader.read(_constants.UINT32);

								case 9:
									headerLength = _context.sent;
									_context.t2 = JSON;
									_context.next = 13;
									return _this2.reader.read(_constants.STRING, headerLength);

								case 13:
									_context.t3 = _context.sent;
									header = _context.t2.parse.call(_context.t2, _context.t3);

									_this2.refs = header.refs;
									_this2.classes = header.classes;
									_this2.root = header.root;

									// construct the object
									_context.t4 = res;
									_context.next = 21;
									return _this2.parse(_this2.root);

								case 21:
									_context.t5 = _context.sent;
									(0, _context.t4)(_context.t5);

								case 23:
								case 'end':
									return _context.stop();
							}
						}
					}, _callee, _this2);
				}));

				return function (_x3, _x4) {
					return _ref.apply(this, arguments);
				};
			}());
		}
	}, {
		key: 'parseBuffer',
		value: function parseBuffer(buffer) {
			this.reader = new _BufferReader2.default(buffer);

			// validate the buffer type
			if (this.reader.read(_constants.STRING, _constants.SIZE_MAGIC_NUMBER) != _constants.MAGIC_NUMBER) {
				throw new Error('Buffer is not a Typed Binary JSON format');
			}

			// get the header length
			var headerLength = this.reader.read(_constants.UINT32);

			// read and parse the header
			var header = JSON.parse(this.reader.read(_constants.STRING, headerLength));
			this.refs = header.refs;
			this.classes = header.classes;
			this.root = header.root;

			// construct the object
			return this.parse(this.root);
		}
	}, {
		key: 'parseFileAsStream',
		value: function () {
			var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(filename) {
				return _regenerator2.default.wrap(function _callee2$(_context2) {
					while (1) {
						switch (_context2.prev = _context2.next) {
							case 0:
								_context2.prev = 0;
								_context2.next = 3;
								return this.parse(_fs2.default.createReadStream(filename));

							case 3:
								return _context2.abrupt('return', _context2.sent);

							case 6:
								_context2.prev = 6;
								_context2.t0 = _context2['catch'](0);
								throw new Error('Tbjson failed to parse "' + filename + '": ' + _context2.t0);

							case 9:
							case 'end':
								return _context2.stop();
						}
					}
				}, _callee2, this, [[0, 6]]);
			}));

			function parseFileAsStream(_x5) {
				return _ref2.apply(this, arguments);
			}

			return parseFileAsStream;
		}()
	}, {
		key: 'parseFileAsBuffer',
		value: function parseFileAsBuffer(filename) {
			try {
				return this.parseBuffer(_fs2.default.readFileSync(filename));
			} catch (e) {
				throw new Error('Tbjson failed to parse "' + filename + '": ' + e);
			}
		}
	}, {
		key: 'parse',
		value: function parse(def) {

			// a type
			if (typeof def == 'number') {

				// primitive
				if (def < _constants.TYPE_OFFSET) {
					return this.reader.read(def);

					// custom type
				} else if (def < _constants.CLASS_OFFSET) {
					return this.reader.read(def);

					// class
				} else if (def < _constants.ARRAY_OFFSET) {
					return this.parse(this.classes[def]);

					// typed array
				} else {

					var length = this.reader.read(_constants.UINT32);
					var objs = [];

					for (var i = 0; i < length; ++i) {
						objs.push(this.parse(def ^ _constants.ARRAY_OFFSET));
					}
					return objs;
				}

				// a fixed-length array
			} else if (Array.isArray(def)) {
				var _objs = [];
				for (var _i = 0; _i < def.length; ++_i) {
					_objs.push(this.parse(def[_i]));
				}
				return _objs;

				// an object
			} else {
				var obj = {};
				for (var key in def) {
					obj[key] = this.parse(def[key]);
				}
				return obj;
			}
		}

		/* private */

	}, {
		key: 'fmtDef',
		value: function fmtDef(def) {
			switch (typeof def === 'undefined' ? 'undefined' : (0, _typeof3.default)(def)) {
				case 'number':
					return def;

				case 'string':
					if (this.refs[def]) {
						return this.refs[def];
					}
					this.refs[def] = this.nextClassCode++;
					return this.refs[def];

				case 'object':
					if (Array.isArray(def)) {
						if (def.length == 2 && def[0] == _constants.ARRAY) {
							return _constants.ARRAY_OFFSET + this.fmtDef(def[1]);
						} else {
							var fmtDef = [];

							for (var i = 0; i < def.length; ++i) {
								fmtDef.push(this.fmtDef(def[i]));
							}

							return fmtDef;
						}
					} else {

						var _fmtDef = {};

						for (var key in def) {
							_fmtDef[key] = this.fmtDef(def[key]);
						}

						return _fmtDef;
					}

				case 'number':
				case 'boolean':
					// invalid
					break;
			}
		}
	}, {
		key: 'addClass',
		value: function addClass(obj) {
			var template = obj.constructor.tbjson;
			var code = this.refs[template.ref];

			// assign a new reference and definition
			if (!code) {
				code = this.nextClassCode++;
				this.refs[template.ref] = code;
			}

			// this reference has not been defined, so set the definition
			if (!this.classes[code]) {
				this.classes[code] = this.fmtDef(template.def);
			}

			return code;
		}
	}, {
		key: 'serializeDef',
		value: function serializeDef(obj, def) {

			// is typed
			if (typeof def == 'number') {

				// is variable-length fixed typed array 
				if (def > _constants.ARRAY_OFFSET) {
					this.writer.write(_constants.UINT32, obj.length);
					for (var i = 0; i < obj.length; ++i) {
						this.serializeDef(obj[i], def ^ _constants.ARRAY_OFFSET);
					}

					// class object
				} else if (def > _constants.CLASS_OFFSET) {
					this.addClass(obj);
					this.serializeDef(obj, this.classes[def]);

					// is primitive
				} else {
					this.writer.write(def, obj);
				}

				// is a sub object or array
			} else {

				// is fixed-length variable type array
				if (Array.isArray(def)) {
					for (var _i2 = 0; _i2 < def.length; ++_i2) {
						this.serializeDef(obj[_i2], def[_i2]);
					}

					// is a sub object
				} else {
					for (var key in def) {
						this.serializeDef(obj[key], def[key]);
					}
				}
			}
		}
	}, {
		key: 'serialize',
		value: function serialize(obj) {
			switch (typeof obj === 'undefined' ? 'undefined' : (0, _typeof3.default)(obj)) {
				case 'boolean':
					this.writer.write(_constants.BOOL, obj);
					return _constants.BOOL;

				case 'number':
					this.writer.write(_constants.FLOAT32, obj);
					return _constants.FLOAT32;

				case 'string':
					this.writer.write(_constants.STRING, obj);
					return _constants.STRING;

				case 'object':
					if (Array.isArray(obj)) {

						var refs = [];

						for (var i = 0; i < obj.length; ++i) {
							refs.push(this.serialize(obj[i]));
						}

						return refs;
					} else {

						// the object is a known tbjson class
						if (obj.constructor && obj.constructor.tbjson) {

							// add this object type to the known classes
							var code = this.addClass(obj);

							// process the class
							this.serializeDef(obj, this.classes[code]);

							return code;
						}

						var ref = {};

						for (var key in obj) {
							ref[key] = this.serialize(obj[key]);
						}

						return ref;
					}
			}
		}
	}]);
	return Tbjson;
}();

exports.default = Tbjson;


Tbjson.TYPES = { BYTE: _constants.BYTE, BOOL: _constants.BOOL, INT8: _constants.INT8, UINT8: _constants.UINT8, INT16: _constants.INT16, UINT16: _constants.UINT16, INT32: _constants.INT32, UINT32: _constants.UINT32, FLOAT32: _constants.FLOAT32, FLOAT64: _constants.FLOAT64, STRING: _constants.STRING, ARRAY: _constants.ARRAY, OBJECT: _constants.OBJECT, CUSTOM: _constants.CUSTOM };