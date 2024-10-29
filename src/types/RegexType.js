import Type from './Type';

export default class RegexType extends Type {

	constructor(ref) {
		super(ref || RegexType.ref);
	}

	serialize(regex) {

		let string = regex.toString();
		let buffer = Buffer.allocUnsafe(string.length);

		buffer.write(string, 'utf8');

		return buffer;
	}

	deserialize (buffer) {

		let string = buffer.toString('utf8');
		let flagIndex = string.lastIndexOf('/');

		return new RegExp(string.slice(1, flagIndex), string.slice(flagIndex + 1));
	}
}

RegexType.ref = '@Regex';