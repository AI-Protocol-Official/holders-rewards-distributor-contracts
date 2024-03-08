// BN utils
const {
	ETH,
	BN,
	toBN,
	isBN,
} = require("../../include/bn_utils");

// bonding curve function shifts
const ETH_PRICE_DIVIDER = new BN(2);
const ERC20_PRICE_MULTIPLIER = new BN(100_000 / 2);

/**
 * Bonding curve function definition. The function calculating the price
 *      of the `amount` of shares given the current total supply `supply`
 *
 * @param s total shares supply
 * @param a number of shares to buy/sell
 * @return the price of the shares (all `amount` amount)
 */
function get_price(s, a) {
	s = toBN(s);
	a = toBN(a);

	const Z = toBN(0);
	const ONE = toBN(1);

	// reference impl:
/*
	uint256 sum1 = s == 0 ? 0 : (s - 1) * s * (2 * (s - 1) + 1) / 6;
	uint256 sum2 = s == 0 && a <= 1 ? 0 : (s + a - 1) * (s + a) * (2 * (s + a - 1) + 1) / 6;
	uint256 summation = sum2 - sum1;
	return summation * 1 ether / 16000;
*/

	// JS impl:
	const sum1 = s.isZero()? Z: s.subn(1).mul(s).mul(s.subn(1).muln(2).addn(1)).divn(6);
	const sum2 = s.isZero() && a.eq(ONE)? Z: s.add(a).subn(1).mul((s.add(a))).mul((s.add(a).subn(1).muln(2).addn(1))).divn(6);

	const summation = sum2.sub(sum1);

	return ETH.mul(summation).divn(16000);
}

/**
 * The price of the `amount` of shares to buy calculated based on
 *      the total shares supply
 *
 * @param supply total shares supply
 * @param amount number of shares to buy
 * @return the price of the shares to buy
 */
function get_buy_price(supply, amount) {
	return get_price(supply, amount);
}

/**
 * The price of the `amount` of shares to sell calculated based on
 *      the total shares supply
 *
 * @param supply total shares supply
 * @param amount number of shares to sell
 * @return the price of the shares to sell
 */
function get_sell_price(supply, amount) {
	supply = toBN(supply);
	amount = toBN(amount);
	return get_price(supply.sub(amount), amount);
}

/**
 * The price of the `amount` of shares to buy, including all fees;
 *      calculated based on the total shares supply and fees percentages
 *
 * @param supply total shares supply
 * @param amount number of shares to buy
 * @param protocol_fee_percent protocol fee percent
 * @param holders_fee_percent shares holders fee percent
 * @param subject_fee_percent subject fee percent
 * @return the price of the shares to buy
 */
function get_buy_price_after_fee(supply, amount, protocol_fee_percent, holders_fee_percent, subject_fee_percent) {
	protocol_fee_percent = guess_percent(protocol_fee_percent);
	holders_fee_percent = guess_percent(holders_fee_percent);
	subject_fee_percent = guess_percent(subject_fee_percent);

	const price = get_buy_price(supply, amount);
	const protocol_fee = price.mul(protocol_fee_percent).div(ETH);
	const holders_fee = price.mul(holders_fee_percent).div(ETH);
	const subject_fee = price.mul(subject_fee_percent).div(ETH);
	return price.add(protocol_fee).add(holders_fee).add(subject_fee);
}

/**
 * The price of the `amount` of shares to sell, including all fees;
 *      calculated based on the total shares supply and fees percentages
 *
 * @param supply total shares supply
 * @param amount number of shares to sell
 * @param protocol_fee_percent protocol fee percent
 * @param holders_fee_percent shares holders fee percent
 * @param subject_fee_percent subject fee percent
 * @return the price of the shares to sell
 */
function get_sell_price_after_fee(supply, amount, protocol_fee_percent, holders_fee_percent, subject_fee_percent) {
	protocol_fee_percent = guess_percent(protocol_fee_percent);
	holders_fee_percent = guess_percent(holders_fee_percent);
	subject_fee_percent = guess_percent(subject_fee_percent);

	const price = get_sell_price(amount);
	const protocol_fee = price.mul(protocol_fee_percent).div(ETH);
	const holders_fee = price.mul(holders_fee_percent).div(ETH);
	const subject_fee = price.mul(subject_fee_percent).div(ETH);
	return price.sub(protocol_fee).sub(holders_fee).sub(subject_fee);
}

/**
 * Fee percent can have different formats and this function tries to guess it
 * Supports thee formats:
 *       - decimal, example: 0.1
 *       - percent, example: 10
 *       - BigNumber, example: 100000000000000000
 *
 * @param percent fee percent value
 * @returns normalized fee percent value where 10^18 is 100%
 */
function guess_percent(percent) {
	if(isBN(percent)) {
		return percent;
	}

	const ONE_PERCENT = toBN(10).pow(toBN(16));
	if(percent < 1) {
		return toBN(percent * 100).mul(ONE_PERCENT);
	}
	if(percent < 100) {
		return toBN(percent).mul(ONE_PERCENT);
	}
	return toBN(percent);
}

// ETH/ERC20 functions counting for curve shifts
const get_price_eth = (...args) => get_price(...args).div(ETH_PRICE_DIVIDER);
const get_buy_price_eth = (...args) => get_buy_price(...args).div(ETH_PRICE_DIVIDER);
const get_sell_price_eth = (...args) => get_sell_price(...args).div(ETH_PRICE_DIVIDER);
const get_buy_price_after_fee_eth = (...args) => get_buy_price_after_fee(...args).div(ETH_PRICE_DIVIDER);
const get_sell_price_after_fee_eth = (...args) => get_sell_price_after_fee(...args).div(ETH_PRICE_DIVIDER);
const get_price_erc20 = (...args) => get_price(...args).mul(ERC20_PRICE_MULTIPLIER);
const get_buy_price_erc20 = (...args) => get_buy_price(...args).mul(ERC20_PRICE_MULTIPLIER);
const get_sell_price_erc20 = (...args) => get_sell_price(...args).mul(ERC20_PRICE_MULTIPLIER);
const get_buy_price_after_fee_erc20 = (...args) => get_buy_price_after_fee(...args).mul(ERC20_PRICE_MULTIPLIER);
const get_sell_price_after_fee_erc20 = (...args) => get_sell_price_after_fee(...args).mul(ERC20_PRICE_MULTIPLIER);

// export public module API
module.exports = {
	ETH,
	ETH_PRICE_DIVIDER,
	ERC20_PRICE_MULTIPLIER,
	get_price,
	get_buy_price,
	get_sell_price,
	get_buy_price_after_fee,
	get_sell_price_after_fee,
	get_price_eth,
	get_buy_price_eth,
	get_sell_price_eth,
	get_buy_price_after_fee_eth,
	get_sell_price_after_fee_eth,
	get_price_erc20,
	get_buy_price_erc20,
	get_sell_price_erc20,
	get_buy_price_after_fee_erc20,
	get_sell_price_after_fee_erc20,
}
