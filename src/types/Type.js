export default class Type {

	constructor(ref, size) {

		// a type reference (name) always starts with @
		if (typeof ref == 'string') {
			ref = ref[0] == '@' ? ref : '@' + ref;
		} else {
			ref = null;
		}

		this.ref = ref;
		this.size = size || 0;
	}

	serialize() {}
	deserialize() {}
}