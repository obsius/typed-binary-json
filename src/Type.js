export default class Type {
	constructor(reference, serializer, deserializer) {
		this.reference = reference;
		this.serializer = serializer;
		this.deserializer = deserializer;
	}
}