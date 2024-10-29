import {
	NULL,
	BOOL,
	UINT8,
	INT8,
	UINT16,
	INT16,
	UINT32,
	INT32,
	FLOAT32,
	FLOAT64,
	STRING,
	UNKNOWN,

	SIZE_UINT8,
	SIZE_INT8,
	SIZE_UINT16,
	SIZE_INT16,
	SIZE_UINT32,
	SIZE_INT32,
	SIZE_FLOAT32,
	SIZE_FLOAT64,

	DEFAULT_BUFFER_SIZE,
	DEFAULT_X_FACTOR,
	DEFAULT_STR_ENCODING
} from '../constants';

const MAX_BYTES_PER_CHAR_UNICODE = 4;
const MAX_BYTES_PER_CHAR_ASCII = 1;

export default class BufferWriter {

	offset = 0;

	get size() {
		return this.buffer.length;
	}

	constructor(size = DEFAULT_BUFFER_SIZE, xFactor = DEFAULT_X_FACTOR, strEncoding = DEFAULT_STR_ENCODING) {

		this.buffer = Buffer.allocUnsafe(size);
		this.xFactor = xFactor;
		this.strEncoding = strEncoding;

		if (strEncoding == 'asci') {
			this.maxBytesPerChar = MAX_BYTES_PER_CHAR_ASCII;
		} else {
			this.maxBytesPerChar = MAX_BYTES_PER_CHAR_UNICODE;
		}
	}

	getBuffer() {
		return this.buffer.slice(0, this.offset);
	}

	grow(size) {
		do {
			this.buffer = Buffer.concat([this.buffer, Buffer.allocUnsafe(this.size * Math.floor(this.xFactor / 2))]);
		} while (size && this.offset + size > this.size);
	}

	write(type, val) {
		switch (type) {

			case NULL:
				val = 0;
			case BOOL:
			case UINT8:
				this.checkSize(SIZE_UINT8);
				this.buffer.writeUInt8(val, this.offset);
				this.offset += SIZE_UINT8;
				break;

			case INT8:
				this.checkSize(SIZE_INT8);
				this.buffer.writeInt8(val, this.offset);
				this.offset += SIZE_INT8;
				break;

			case UINT16:
				this.checkSize(SIZE_UINT16);
				this.buffer.writeUInt16BE(val, this.offset);
				this.offset += SIZE_UINT16;
				break;

			case INT16:
				this.checkSize(SIZE_INT16);
				this.buffer.writeInt16BE(val, this.offset);
				this.offset += SIZE_INT16;
				break;

			case UINT32:
				this.checkSize(SIZE_UINT32);
				this.buffer.writeUInt32BE(val, this.offset);
				this.offset += SIZE_UINT32;
				break;

			case INT32:
				this.checkSize(SIZE_INT32);
				this.buffer.writeInt32BE(val, this.offset);
				this.offset += SIZE_INT32;
				break;

			case FLOAT32:
				this.checkSize(SIZE_FLOAT32);
				this.buffer.writeFloatBE(val, this.offset);
				this.offset += SIZE_FLOAT32;
				break;

			case FLOAT64:
				this.checkSize(SIZE_FLOAT64);
				this.buffer.writeDoubleBE(val, this.offset);
				this.offset += SIZE_FLOAT64;
				break;

			case STRING:

				// empty string
				if (typeof val != 'string' || !val.length) {
					this.write(UINT8, 0);

				// variable length / encoded string
				} else {

					// max possible size
					let size = val.length * this.maxBytesPerChar;
					let lengthSize = (size < 128 ? 1 : size < 16384 ? 2 : 4);

					this.checkSize(size + lengthSize);

					// write out string and pre-allocate bytes to hold string length
					size = this.buffer.write(val, this.offset + lengthSize, size, this.strEncoding);

					// R00000000 first bit reserved for signaling to use 2 bytes, max string length is: 2^7 = 128
					if (lengthSize == 1) {
						this.buffer.writeUInt8(size, this.offset);

					// 1R000000 first bit must be 1, second bit reserved for signaling to use 4 bytes, max string length is: 2^16 - (2^15 + 2^14) = 16384
					} else if (lengthSize == 2) {
						this.buffer.writeUInt16BE(size + 32768, this.offset);

					// 11000000 first two bits must be 1, max string length is: 2^32 - (2^31 + 2^30) = 1073741824
					} else {
						this.buffer.writeUInt32BE(size + 3221225472, this.offset);
					}

					this.offset += size + lengthSize;
				}
				break;

			case UNKNOWN:
				switch (typeof val) {

					case 'boolean':
						this.write(UINT8, BOOL);
						this.write(BOOL, val);
						break;

					case 'number':
						this.write(UINT8, FLOAT64);
						this.write(FLOAT64, val);
						break;

					case 'string':
						this.write(UINT8, STRING);
						this.write(STRING, val);
						break;

					default:
						this.write(NULL);
				}
		}
	}

	writeBuffer(buffer) {
		this.checkSize(buffer.length);
		buffer.copy(this.buffer, this.offset);
		this.offset += buffer.length;
	}

	writeFixedLengthString(val) {
		this.checkSize(val.length * this.maxBytesPerChar);
		this.offset += this.buffer.write(val, this.offset, val.length * this.maxBytesPerChar, this.strEncoding);
	}

	/* internal */

	checkSize(size) {
		if (this.offset + size > this.buffer.length) {
			this.grow(size);
		}
	}
}