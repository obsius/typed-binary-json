import Type from './Type';

export default class DateType extends Type {

	constructor(ref) {
		super(ref || DateType.ref, DateType.size);
	}

	serialize(date) {

		let buffer = Buffer.allocUnsafe(DateType.size);
		buffer.writeBigInt64BE(BigInt(date.getTime()));

		return buffer;
	}

	deserialize (buffer) {
		return new Date(Number(buffer.readBigInt64BE()));
	}
}

DateType.ref = '@Date';
DateType.size = 8;