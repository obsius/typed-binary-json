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

var BufferReader = function () {
	function BufferReader(buffer) {
		(0, _classCallCheck3.default)(this, BufferReader);
		this.offset = 0;

		this.buffer = buffer;
	}

	(0, _createClass3.default)(BufferReader, [{
		key: 'read',
		value: function read(type) {
			var length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

			var data = void 0;

			switch (type) {

				case _constants.BOOL:
					data = !!this.buffer.readUInt8(this.offset);
					this.offset += _constants.SIZE_UINT8;
					break;

				case _constants.UINT8:
					data = this.buffer.readUInt8(this.offset);
					this.offset += _constants.SIZE_UINT8;
					break;

				case _constants.INT8:
					data = this.buffer.readInt8(this.offset);
					this.offset += _constants.SIZE_INT8;
					break;

				case _constants.UINT16:
					data = this.buffer.readUInt16LE(this.offset);
					this.offset += _constants.SIZE_UINT16;
					break;

				case _constants.INT16:
					data = this.buffer.readInt16LE(this.offset);
					this.offset += _constants.SIZE_INT16;
					break;

				case _constants.UINT32:
					data = this.buffer.readUInt32LE(this.offset);
					this.offset += _constants.SIZE_UINT32;
					break;

				case _constants.INT32:
					data = this.buffer.readInt32LE(this.offset);
					this.offset += _constants.SIZE_INT32;
					break;

				case _constants.FLOAT32:
					data = this.buffer.readFloatLE(this.offset);
					this.offset += _constants.SIZE_FLOAT32;
					break;

				case _constants.FLOAT64:
					data = this.buffer.readDoubleLE(this.offset);
					this.offset += _constants.SIZE_FLOAT64;
					break;

				case _constants.STRING:
					if (length) {
						data = this.buffer.toString('utf-8', this.offset, this.offset + length);
						this.offset += length;
					} else {
						length = this.nextNullAt();
						data = this.buffer.toString('utf-8', this.offset, length);
						this.offset = length + 1;
					}
					break;
			}

			return data;
		}

		/* private */

	}, {
		key: 'nextNullAt',
		value: function nextNullAt() {
			for (var i = this.offset; i < this.buffer.length; ++i) {
				if (!this.buffer[i]) {
					return i;
				}
			}

			throw new Error('BufferReader could not find a null value');
		}
	}]);
	return BufferReader;
}();

exports.default = BufferReader;