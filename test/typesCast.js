export default function(Tbjson, stringify) {

	let tbjson1 = new Tbjson();
	let tbjson2 = new Tbjson();

	tbjson1.registerTypes([
		new Tbjson.Types.BigIntType(),
		new Tbjson.Types.DateType(),
		new Tbjson.Types.RegexType()
	]);

	class A {
		bigint = -999_999_999_999_999n;
		date = new Date(-1000);
		regex = /abcdefg\\/i;
	};

	A.tbjson = {
		definition: {
			bigint: Tbjson.Types.BigIntType.ref,
			date: Tbjson.Types.DateType.ref,
			regex: Tbjson.Types.RegexType.ref
		}
	};

	let x = new A();

	return [
		stringify(x, true),
		stringify(
			Tbjson.cast(tbjson2.parseBuffer(tbjson1.serializeToBuffer(x)), A, {
				[Tbjson.Types.BigIntType.ref]: new Tbjson.Types.BigIntType(),
				[Tbjson.Types.DateType.ref]: new Tbjson.Types.DateType(),
				[Tbjson.Types.RegexType.ref]: new Tbjson.Types.RegexType()
			}),
			true
		)
	];
}