'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _constants = require('./constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var StreamBufferReader = function () {
	function StreamBufferReader(stream) {
		var _this = this;

		var size = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 8388608;
		(0, _classCallCheck3.default)(this, StreamBufferReader);


		this.stream = stream;
		this.size = size;
		this.tempSize = size;

		this.buffer = Buffer.allocUnsafe(size);

		this.writeOffset = 0;
		this.readOffset = 0;

		this.stream.on('data', function (chunk) {

			if (_this.writeOffset + chunk.length > _this.tempSize) {
				_this.stream.pause();
			}

			_this.buffer.fill(chunk, _this.writeOffset, _this.writeOffset + chunk.length);
			_this.writeOffset += chunk.length;

			if (_this.waitingRead) {
				_this.waitingRead();
			}
		});
	}

	(0, _createClass3.default)(StreamBufferReader, [{
		key: 'readUntilNull',
		value: function readUntilNull(fn) {
			for (var i = this.readOffset; i < this.buffer.length; ++i) {
				if (this.buffer[i] == null) {
					fn(this.buffer.slice(this.offset, i));
					this.incReadOffset(i - this.readOffset);
				}
			}
		}
	}, {
		key: 'read',
		value: function read(type) {
			var _this2 = this;

			var length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

			switch (type) {
				case _constants.UINT32:
					this.readBytes(_constants.SIZE_UINT32, function (readOffset) {
						return fn(_this2.buffer.readUInt32(readOffset));
					});
					break;

				case _constants.FLOAT32:
					this.readBytes(_constants.SIZE_FLOAT32, function (readOffset) {
						return fn(_this2.buffer.readFloat32(readOffset));
					});
					break;

				case _constants.STRING:
					if (length) {
						this.readBytes(length, function (readOffset) {
							return fn(_this2.buffer.toString('utf-8', readOffset, length));
						});
					} else {
						this.readUntilNull();
					}

			}
		}

		/* private */

	}, {
		key: 'incReadOffset',
		value: function incReadOffset(length) {
			this.readOffset += length;

			if (this.readOffset > this.size) {

				this.writeOffset = this.buffer.length - this.writeOffset;
				this.readOffset = 0;

				this.newBuffer = Buffer.allocUnsafe(this.size);
				this.newBuffer.fill(this.offset, this.buffer.length);
				this.buffer = this.newBuffer;

				if (this.stream.isPaused()) {
					this.stream.resume();
				}
			}
		}
	}, {
		key: 'readBytes',
		value: function readBytes(length) {
			var _this3 = this;

			if (this.readOffset + length > this.writeOffset) {
				return new _promise2.default(function (res, rej) {

					if (_this3.size < _this3.readOffset + length) {
						_this3.tmpSize = _this3.readOffset + length;
					}

					_this3.waitingRead = function () {
						_this3.tempSize = _this3.size;
						_this3.readBytes(length, fn);
					};
				});
			} else {
				var readOffset = this.readOffset;
				this.incReadOffset(length);
				return readOffset;
			}
		}
	}]);
	return StreamBufferReader;
}();

exports.default = StreamBufferReader;