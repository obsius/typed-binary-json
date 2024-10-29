import {
	UINT32,
	FLOAT32,
	STRING,

	SIZE_UINT32,
	SIZE_FLOAT32,

	DEFAULT_BUFFER_SIZE,
	DEFAULT_STR_ENCODING
} from '../constants';

export default class StreamBufferReader {

	constructor(stream, size = DEFAULT_BUFFER_SIZE, strEncoding = DEFAULT_STR_ENCODING) {

		this.stream = stream;
		this.size = size;
		this.strEncoding = strEncoding;

		this.tempSize = size;
		this.buffer = Buffer.allocUnsafe(size);

		this.writeOffset = 0;
		this.readOffset = 0;

		this.stream.on('data', (chunk) => {

			if (this.writeOffset + chunk.length > this.tempSize) {
				this.stream.pause();
			}

			this.buffer.fill(chunk, this.writeOffset, this.writeOffset + chunk.length);
			this.writeOffset += chunk.length;
			
			if (this.waitingRead) {
				this.waitingRead();
			}
		});
	}

	readUntilNull(fn) {
		for (let i = this.readOffset; i < this.buffer.length; ++i) {
			if (this.buffer[i] == null) {
				fn(this.buffer.slice(this.offset, i));
				this.incReadOffset(i - this.readOffset);
			}
		}
	}

	read(type, length = 0) {
		switch (type) {
			case UINT32:
				this.readBytes(SIZE_UINT32, (readOffset) => fn(this.buffer.readUInt32(readOffset)));
				break;

			case FLOAT32:
				this.readBytes(SIZE_FLOAT32, (readOffset) => fn(this.buffer.readFloat32(readOffset)));
				break;
				
			case STRING:
				if (length) {
					this.readBytes(length, (readOffset) => fn(this.buffer.toString(this.strEncoding, readOffset, length)));
				} else {
					this.readUntilNull();
				}
		}
	}

	/* internal */

	incReadOffset(length) {
		this.readOffset += length;

		if (this.readOffset > this.size) {

			this.writeOffset = this.buffer.length - this.writeOffset;
			this.readOffset = 0;

			this.newBuffer = Buffer.allocUnsafe(this.size);
			this.newBuffer.fill(this.offset, this.buffer.length);
			this.buffer = this.newBuffer;

			if (this.stream.isPaused()) { this.stream.resume(); }
		}
	}

	readBytes(length) {
		if (this.readOffset + length > this.writeOffset) {
			return new Promise((res, rej) => {

				if (this.size < this.readOffset + length) {
					this.tmpSize = this.readOffset + length;
				}
				
				this.waitingRead = () => {
					this.tempSize = this.size;
					this.readBytes(length, fn);
				};
			});
		} else {
			let readOffset = this.readOffset;
			this.incReadOffset(length);
			return readOffset;
		}
	}
}