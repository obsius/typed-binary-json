export default function(Tbjson, stringify) {

	let tbjson = new Tbjson();

	tbjson.registerTypes([
		new Tbjson.Types.BigIntType(),
		new Tbjson.Types.DateType(),
		new Tbjson.Types.RegexType()
	]);

	class A {
		bigInt = 999_999_999_999_999n;
		date = new Date();
		regex = new RegExp('^[0-9]+$', 'i');
		nullableBigInt = -9n;
		nullableDate = new Date(0);
		nullableRegex = /[0-9]/;
		nullBigInt = null;
		nullDate = null;
		nullRegex = null;
	};

	A.tbjson = {
		definition: {
			bigInt: Tbjson.Types.BigIntType.ref,
			date: Tbjson.Types.DateType.ref,
			regex: Tbjson.Types.RegexType.ref,
			nullableBigInt: [Tbjson.TYPES.NULLABLE, Tbjson.Types.BigIntType.ref],
			nullableDate: [Tbjson.TYPES.NULLABLE, Tbjson.Types.DateType.ref],
			nullableRegex: [Tbjson.TYPES.NULLABLE, Tbjson.Types.RegexType.ref],
			nullBigInt: [Tbjson.TYPES.NULLABLE, Tbjson.Types.BigIntType.ref],
			nullDate: [Tbjson.TYPES.NULLABLE, Tbjson.Types.DateType.ref],
			nullRegex: [Tbjson.TYPES.NULLABLE, Tbjson.Types.RegexType.ref]
		}
	};

	let x = new A();

	return [
		stringify(x, true),
		stringify(tbjson.parseBuffer(tbjson.serializeToBuffer(x)), true)
	];
}