const {BN} = require("@openzeppelin/test-helpers");
const {web3} = require("@openzeppelin/test-helpers/src/setup");
const {fromWei} = web3.utils;

class Tracker {
	constructor(acc, token, unit) {
		this.account = acc;
		this.token = token;
		this.unit = unit;
	}

	async delta(unit = this.unit) {
		const current = await balanceCurrent(this.account, this.token);
		const delta = current.sub(this.prev);
		this.prev = current;
		this.prevBlock = await web3.eth.getBlockNumber();

		return new BN(fromWei(delta, unit));
	}

	async deltaWithFees(unit = this.unit) {
		return {
			delta: await this.delta(unit),
			fees: new BN(0),
		};
	}

	async get(unit = this.unit) {
		this.prev = await balanceCurrent(this.account, this.token);
		this.prevBlock = await web3.eth.getBlockNumber();
		return new BN(fromWei(this.prev, unit));
	}
}

async function balanceTracker(owner, token, unit = 'wei') {
	const tracker = new Tracker(owner, token, unit);
	await tracker.get();
	return tracker;
}

async function balanceCurrent(account, token, unit = 'wei') {
	return new BN(fromWei(await token.balanceOf(account), unit));
}

module.exports = {
	current: balanceCurrent,
	tracker: balanceTracker,
};
