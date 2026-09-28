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

	DEFAULT_STR_ENCODING
} from '../constants';

export default class BufferReader {

	offset = 0;

	constructor(buffer, strEncoding = DEFAULT_STR_ENCODING) {

		this.buffer = buffer;
		this.strEncoding = strEncoding;

		this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	}

	read(type) {
		let data;

		switch (type) {

			case NULL:
				data = null;
				break;

			case BOOL:
				data = !!this.buffer[this.offset];
				this.offset += SIZE_UINT8;
				break;

			case UINT8:
				data = this.buffer[this.offset];
				this.offset += SIZE_UINT8;
				break;

			case INT8:
				data = this.view.getInt8(this.offset);
				this.offset += SIZE_INT8;
				break;

			case UINT16:
				data = this.view.getUint16(this.offset);
				this.offset += SIZE_UINT16;
				break;

			case INT16:
				data = this.view.getInt16(this.offset);
				this.offset += SIZE_INT16;
				break;

			case UINT32:
				data = this.view.getUint32(this.offset);
				this.offset += SIZE_UINT32;
				break;

			case INT32:
				data = this.view.getInt32(this.offset);
				this.offset += SIZE_INT32;
				break;

			case FLOAT32:
				data = this.view.getFloat32(this.offset);
				this.offset += SIZE_FLOAT32;
				break;

			case FLOAT64:
				data = this.view.getFloat64(this.offset);
				this.offset += SIZE_FLOAT64;
				break;

			case STRING:

				let length;

				if (this.buffer[this.offset] < 128) {
					length = this.read(UINT8);
				} else if (this.buffer[this.offset] < 192) {
					length = this.read(UINT16) - 32768;
				} else {
					length = this.read(UINT32) - 3221225472;
				}

				data = this.buffer.toString(this.strEncoding, this.offset, this.offset + length);
				
				this.offset += length;

				break;

			case UNKNOWN:
				data = this.read(this.read(UINT8));
		}

		return data;
	}

	readBuffer(length) {

		let buffer = this.buffer.slice(this.offset, this.offset + length);
		this.offset += length;

		return buffer;
	}

	readFixedLengthString(length) {

		let data = this.buffer.toString(this.strEncoding, this.offset, this.offset + length);
		this.offset += length;

		return data;
	}

	readTypedArray(type, length) {

		let byteOffset = this.buffer.byteOffset + this.offset;
		let buffer = this.buffer.buffer.slice(byteOffset, byteOffset + length);

		this.offset += length;

		switch (type) {
			case UINT8:   return new Uint8Array(buffer);
			case INT8:    return new Int8Array(buffer);
			case UINT16:  return new Uint16Array(buffer);
			case INT16:   return new Int16Array(buffer);
			case UINT32:  return new Uint32Array(buffer);
			case INT32:   return new Int32Array(buffer);
			case FLOAT32: return new Float32Array(buffer);
			case FLOAT64: return new Float64Array(buffer);
		}
	}

	////////////////////////////////////////////////////////////////

	nextNullAt() {
		for (let i = this.offset; i < this.buffer.length; ++i) {
			if (!this.buffer[i]) { return i; }
		}

		throw new Error('BufferReader could not find a null value'); 
	}
}