import BufferWriter from './BufferWriter';

export default class StreamBufferWriter extends BufferWriter {

	streamIndex = 0;
	streamReady = true;

	constructor(stream, size, xFactor, strEncoding) {
		super(size, xFactor, strEncoding);
		this.stream = stream;
	}

	/* internal */

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

	checkSize(size) {
		if (this.offset + size > this.size) {
			if (this.streamReady && !this.flush()) {
				this.grow();
			} else {
				this.grow();
			}
		}
	}
}