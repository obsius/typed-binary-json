export default function(Tbjson, stringify, validateTypes) {

	let tbjson = new Tbjson();

	class Item {}
	Item.tbjson = {
		definition: {},
		cast: (obj) => obj.a ? A : B
	};

	class A extends Item {
		a = 100;
	}
	A.tbjson = {
		definition: {
			a: Tbjson.TYPES.INT32
		}
	};

	class B extends Item {
		b = 1000;
	}
	B.tbjson = {
		definition: {
			b: Tbjson.TYPES.INT32
		}
	};

	class X {
		item = new A();
		itemsArray = [new A(), new B(), new B(), new A()];
		itemsObject = {
			a: new A(),
			b: new B()
		};
	}
	X.tbjson = {
		definition: {
			item: [Tbjson.TYPES.INSTANCE, Item],
			itemsArray: [Tbjson.TYPES.ARRAY, [Tbjson.TYPES.INSTANCE, Item]],
			itemsObject: [Tbjson.TYPES.OBJECT, [Tbjson.TYPES.INSTANCE, Item]]
		}
	};

	let x = new X();

	let typedX = Tbjson.cast(JSON.parse(stringify(x)), X);

	let invalid = validateTypes(x, typedX);
	if (invalid) { return invalid; }

	return [
		stringify(x),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)))
	];
}