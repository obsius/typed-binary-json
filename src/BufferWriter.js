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

	SIZE_UINT8,
	SIZE_INT8,
	SIZE_UINT16,
	SIZE_INT16,
	SIZE_UINT32,
	SIZE_INT32,
	SIZE_FLOAT32,
	SIZE_FLOAT64,
} from './constants';

const DEFAULT_BUFFER_SIZE = 16384;
const DEFAULT_X_FACTOR = 2;
const DEFAULT_STR_ENCODING = 'utf-8';

export default class BufferWriter {

	offset = 0;

	constructor(size = DEFAULT_BUFFER_SIZE, xFactor = DEFAULT_X_FACTOR, strEncoding = DEFAULT_STR_ENCODING) {
		this.buffer = Buffer.allocUnsafe(size);
		this.xFactor = xFactor;
		this.strEncoding = strEncoding;
	}

	get size() {
		return this.buffer.length;
	}

	getBuffer() {
		return this.buffer.slice(0, this.offset);
	}

	grow() {
		this.buffer = Buffer.concat([this.buffer, Buffer.allocUnsafe(this.size * Math.floor(this.xFactor / 2))]);
	}

	writeFixedLengthString(val) {
		this.buffer.write(val, this.offset, val.length, this.strEncoding);
		this.offset += val.length;
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
				this.buffer.writeUInt16LE(val, this.offset);
				this.offset += SIZE_UINT16;
				break;

			case INT16:
				this.checkSize(SIZE_INT16);
				this.buffer.writeInt16LE(val, this.offset);
				this.offset += SIZE_INT16;
				break;

			case UINT32:
				this.checkSize(SIZE_UINT32);
				this.buffer.writeUInt32LE(val, this.offset);
				this.offset += SIZE_UINT32;
				break;

			case INT32:
				this.checkSize(SIZE_INT32);
				this.buffer.writeInt32LE(val, this.offset);
				this.offset += SIZE_INT32;
				break;

			case FLOAT32:
				this.checkSize(SIZE_FLOAT32);
				this.buffer.writeFloatLE(val, this.offset);
				this.offset += SIZE_FLOAT32;
				break;

			case FLOAT64:
				this.checkSize(SIZE_FLOAT64);
				this.buffer.writeDoubleLE(val, this.offset);
				this.offset += SIZE_FLOAT64;
				break;

			case STRING:
				if (typeof val != 'string' || !val.length) {
					this.write(UINT8, 0);
				} else {
					this.writeVariableUint(val.length);
					this.checkSize(val.length);
					this.buffer.write(val, this.offset, val.length, this.strEncoding);
					this.offset += val.length;
				}
		}
	}

	writeVariableUint(val) {
		if (val < 256) {
			this.write(UINT8, val);
		} else if (val < 65536) {
			this.write(UINT16, val);
		} else {
			this.write(UINT32, val);
		}
	}

	writeFixedLengthStr(val) {
		this.checkSize(val.length);
		this.buffer.write(val, this.offset, val.length, this.strEncoding);
		this.offset += val.length;
	}

	writeBuffer(buffer) {
		this.checkSize(buffer.length);
		buffer.copy(this.buffer, this.offset);
		this.offset += buffer.length;
	}

	/* private */

	checkSize(size) {
		while (this.offset + size > this.size) {
			this.grow();
		}
	}
}