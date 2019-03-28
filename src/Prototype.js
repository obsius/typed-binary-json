export default class Prototype {
	constructor(definition, prototype = null, parentCode = null, noInherit = false) {
		this.definition = definition;
		this.prototype = prototype;
		this.parentCode = parentCode;
		this.noInherit = noInherit;
	}
}