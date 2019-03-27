export default class WrapError extends Error {
	constructor(error, msg, ...args) {
		if (error instanceof WrapError) {
			super(msg + '. ' + error.message, ...args);
		} else {
			super(msg + ': ' + error.message, ...args);
		}
		
		this.error = error;
		this.stack = error.stack;
	}
}