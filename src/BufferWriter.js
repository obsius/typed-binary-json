import {
	NULL,
	BYTE,
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

export default class BufferWriter {

	offset = 0;

	constructor(size = 16384, xFactor = 2) {
		this.buffer = Buffer.allocUnsafe(size);
		this.xFactor = xFactor;
	}

	get size() {
		return this.buffer.length;
	}

	resize() {
		this.buffer = Buffer.concat([this.buffer, Buffer.allocUnsafe(this.size * Math.floor(this.xFactor / 2))]);
	}

	write(type, val) {
		switch (type) {

			case NULL:
				val = 0;
			case BYTE:
			case BOOL:
			case UINT8:
				this.buffer.writeUInt8(val, this.offset);
				this.offset += SIZE_UINT8;
				break;

			case INT8:
				this.buffer.writeInt8(val, this.offset);
				this.offset += SIZE_INT8;
				break;

			case UINT16:
				this.buffer.writeUInt16LE(val, this.offset);
				this.offset += SIZE_UINT16;
				break;

			case INT16:
				this.buffer.writeInt16LE(val, this.offset);
				this.offset += SIZE_INT16;
				break;

			case UINT32:
				this.buffer.writeUInt32LE(val, this.offset);
				this.offset += SIZE_UINT32;
				break;

			case INT32:
				this.buffer.writeInt32LE(val, this.offset);
				this.offset += SIZE_INT32;
				break;

			case FLOAT32:
				this.buffer.writeFloatLE(val, this.offset);
				this.offset += SIZE_FLOAT32;
				break;

			case FLOAT64:
				this.buffer.writeDoubleLE(val, this.offset);
				this.offset += SIZE_FLOAT64;
				break;

			case STRING:
				this.buffer.write(val, this.offset, val.length, 'utf-8');
				this.offset += val.length;
				this.buffer.writeUInt8(0, this.offset);
				this.offset += SIZE_UINT8;
		}
	}
}