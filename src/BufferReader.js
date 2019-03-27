import {
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
	SIZE_FLOAT64
} from './constants';

export default class BufferReader {

	offset = 0;

	constructor(buffer) {
		this.buffer = buffer;
	}

	read(type, length = 0) {
		let data;

		switch (type) {

			case BOOL:
				data = !!this.buffer.readUInt8(this.offset);
				this.offset += SIZE_UINT8;
				break;

			case UINT8:
				data = this.buffer.readUInt8(this.offset);
				this.offset += SIZE_UINT8;
				break;

			case INT8:
				data = this.buffer.readInt8(this.offset);
				this.offset += SIZE_INT8;
				break;

			case UINT16:
				data = this.buffer.readUInt16LE(this.offset);
				this.offset += SIZE_UINT16;
				break;

			case INT16:
				data = this.buffer.readInt16LE(this.offset);
				this.offset += SIZE_INT16;
				break;

			case UINT32:
				data = this.buffer.readUInt32LE(this.offset);
				this.offset += SIZE_UINT32;
				break;

			case INT32:
				data = this.buffer.readInt32LE(this.offset);
				this.offset += SIZE_INT32;
				break;

			case FLOAT32:
				data = this.buffer.readFloatLE(this.offset);
				this.offset += SIZE_FLOAT32;
				break;

			case FLOAT64:
				data = this.buffer.readDoubleLE(this.offset);
				this.offset += SIZE_FLOAT64;
				break;

			case STRING:
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

	readTypedArray(type, length) {

		let buffer = this.buffer.buffer.slice(this.offset, this.offset + length);
		this.offset += length;

		switch (type) {
			case UINT8:
				return new Uint8Array(buffer);
			case INT8:
				return new Int8Array(buffer);
			case UINT16:
				return new Uint16Array(buffer);
			case INT16:
				return new Int16Array(buffer);
			case UINT32:
				return new Uint32Array(buffer);
			case INT32:
				return new Int32Array(buffer);
			case FLOAT32:
				return new Float32Array(buffer);
			case FLOAT64:
				return new Float64Array(buffer);
		}
	}

	/* private */

	nextNullAt() {
		for (let i = this.offset; i < this.buffer.length; ++i) {
			if (!this.buffer[i]) { return i; }
		}

		throw new Error('BufferReader could not find a null value'); 
	}
}