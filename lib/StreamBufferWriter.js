'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _constants = require('./constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var StreamBufferWriter = function () {
	function StreamBufferWriter(stream) {
		var size = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 16384;
		var xFactor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 2;
		(0, _classCallCheck3.default)(this, StreamBufferWriter);
		this.streamIndex = 0;
		this.streamReady = true;
		this.offset = 0;

		this.stream = stream;
		this.buffer = Buffer.allocUnsafe(size);
		this.xFactor = xFactor;
	}

	(0, _createClass3.default)(StreamBufferWriter, [{
		key: 'flush',
		value: function flush() {
			var _this = this;

			this.streamReady = this.stream.write(this.buffer.slice(this.streamIndex, this.offset), function () {
				_this.streamReady = true;
			});

			if (this.streamReady) {
				this.offset = 0;
				this.streamIndex = 0;
			} else {
				this.streamIndex = this.offset;
			}

			return this.streamReady;
		}
	}, {
		key: 'resize',
		value: function resize() {
			this.buffer = Buffer.concat([this.buffer, Buffer.allocUnsafe(this.size * Math.floor(this.xFactor / 2))]);
		}
	}, {
		key: 'write',
		value: function write(type, val) {
			switch (type) {

				case _constants.NULL:
					val = 0;
				case _constants.BYTE:
				case _constants.BOOL:
				case _constants.UINT8:
					this.checkFlush(_constants.SIZE_UINT8);
					this.buffer.writeUInt8(val, this.offset);
					this.offset += _constants.SIZE_UINT8;
					break;

				case _constants.INT8:
					this.checkFlush(_constants.SIZE_INT8);
					this.buffer.writeInt8(val, this.offset);
					this.offset += _constants.SIZE_INT8;
					break;

				case _constants.UINT16:
					this.checkFlush(_constants.SIZE_UINT16);
					this.buffer.writeUInt16LE(val, this.offset);
					this.offset += _constants.SIZE_UINT16;
					break;

				case _constants.INT16:
					this.checkFlush(_constants.SIZE_INT16);
					this.buffer.writeInt16LE(val, this.offset);
					this.offset += _constants.SIZE_INT16;
					break;

				case _constants.UINT32:
					this.checkFlush(_constants.SIZE_UINT32);
					this.buffer.writeUInt32LE(val, this.offset);
					this.offset += _constants.SIZE_UINT32;
					break;

				case _constants.INT32:
					this.checkFlush(_constants.SIZE_INT32);
					this.buffer.writeInt32LE(val, this.offset);
					this.offset += _constants.SIZE_INT32;
					break;

				case _constants.FLOAT32:
					this.checkFlush(_constants.SIZE_FLOAT32);
					this.buffer.writeFloatLE(val, this.offset);
					this.offset += _constants.SIZE_FLOAT32;
					break;

				case _constants.FLOAT64:
					this.checkFlush(_constants.SIZE_FLOAT64);
					this.buffer.writeDoubleLE(val, this.offset);
					this.offset += _constants.SIZE_FLOAT64;
					break;

				case _constants.STRING:
					this.checkFlush(val.length + _constants.SIZE_UINT8);
					this.buffer.write(val, this.offset, val.length, 'utf-8');
					this.offset += val.length;
					this.buffer.writeUInt8(0, this.offset);
					this.offset += _constants.SIZE_UINT8;
			}
		}

		/* private */

	}, {
		key: 'checkFlush',
		value: function checkFlush(length) {
			if (this.offset + length > this.size) {
				if (this.streamReady && !this.flush()) {
					this.resize();
				} else {
					this.resize();
				}
			}
		}
	}, {
		key: 'size',
		get: function get() {
			return this.buffer.length;
		}
	}]);
	return StreamBufferWriter;
}();

exports.default = StreamBufferWriter;