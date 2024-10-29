import Type from './Type';

export default class BigIntType extends Type {

	constructor(ref) {
		super(ref || BigIntType.ref, BigIntType.size);
	}

	serialize(bigint) {

		let buffer = Buffer.allocUnsafe(BigIntType.size);
		buffer.writeBigInt64BE(bigint);

		return buffer;
	}

	deserialize(buffer) {
		return buffer.readBigInt64BE();
	}
}

BigIntType.ref = '@BigInt';
BigIntType.size = 8;