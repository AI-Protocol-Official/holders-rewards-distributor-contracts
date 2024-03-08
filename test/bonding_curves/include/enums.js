// Zeppelin test helpers
const {
	BN,
} = require("@openzeppelin/test-helpers");

// see: https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/blob/09eeb9a0bdb6ec9a881a97e16b6ddfd44d118e27/test/helpers/enums.js
function Enum(...options) {
	return Object.fromEntries(options.map((key, i) => [key, new BN(i)]));
}

// export public module API
module.exports = {
	Enum,
	// SharesFactory.ImplementationType
	SharesImplementationType: Enum("ETH", "ERC20"),
};
