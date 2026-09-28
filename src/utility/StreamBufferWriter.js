import BufferWriter from './BufferWriter';

export default class StreamBufferWriter extends BufferWriter {

	streamIndex = 0;
	streamReady = true;

	constructor(stream, size, xFactor, strEncoding) {
		super(size, xFactor, strEncoding);
		this.stream = stream;
	}

	flush() {

		this.streamReady = this.stream.write(this.buffer.slice(this.streamIndex, this.offset), () => {
			this.streamReady = true;
		});

		if (this.streamReady) {
			this.offset = 0;
			this.streamIndex = 0;
		} else {
			this.streamIndex = this.offset;
		}

		return this.streamReady;
	}

	// flush what is written when the stream can take it, grow only when it cannot or the value would not fit anyway
	checkSize(size) {
		if (this.offset + size > this.size && (!this.streamReady || !this.flush() || this.offset + size > this.size)) {
			this.grow(size);
		}
	}
}