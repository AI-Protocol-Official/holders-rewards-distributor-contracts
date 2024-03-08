// Zeppelin test helpers
const {
	BN,
	constants,
	expectEvent,
	expectRevert,
} = require("@openzeppelin/test-helpers");

// Constants
const {
	ZERO_ADDRESS,
	ZERO_BYTES32,
	MAX_UINT256,
} = constants;

const {
	assert,
	expect,
} = require("chai");

// enable chai-subset to allow containSubset instead of deep equals, see https://www.chaijs.com/plugins/chai-subset/
require("chai").use(require("chai-subset"));

// deployment routines in use
const {
	ali_erc20_deploy,
} = require("../ali_token/include/deployment_routines");

// deployment routines in use
const {
	deploy_holders_rewards_distributor,
	deploy_shares_ETH,
	deploy_shares_ERC20,
} = require("./include/deployment_routines");

// run HolderRewardDistributor contract
contract("Holder Reward Distributor", function(accounts) {
	// extract accounts to be used:
	// A0 – special default zero account accounts[0] used by Truffle, reserved
	// a0 – deployment account having all the permissions, reserved
	// H0 – initial token holder account
	// a1, a2,... – working accounts to perform tests on
	const [A0, a0, H0, a1, a2, a3, a4, a5] = accounts;
	const deposit_value = web3.utils.toWei(new BN(1), "ether");
	let rewardDistributor, sharesContract, payment_token;

	async function buyShareEth(rewardDistributor, account, shareAmount, value) {
		const data = web3.eth.abi.encodeParameters(['address', 'bool', 'uint256'], [account, true, shareAmount]);
		return await web3.eth.sendTransaction({
			to: rewardDistributor.address,
			value: value,
			data: data,
			from: a0
		});
	}

	async function sellShareEth(rewardDistributor, account, shareAmount, value) {
		const data = web3.eth.abi.encodeParameters(['address', 'bool', 'uint256'], [account, false, shareAmount]);
		return await web3.eth.sendTransaction({
			to: rewardDistributor.address,
			value: value,
			data: data,
			from: a0
		});
	}

	async function buyShareErc20(rewardDistributor, erc20Token, account, shareAmount, value) {
		const data = web3.eth.abi.encodeParameters(['address', 'bool', 'uint256'], [account, true, shareAmount]);
		return await erc20Token.transferFromAndCall(a0, rewardDistributor.address, value, data, {from: a0});
	}

	async function sellShareErc20(rewardDistributor, erc20Token, account, shareAmount, value) {
		const data = web3.eth.abi.encodeParameters(['address', 'bool', 'uint256'], [account, false, shareAmount]);
		return await erc20Token.transferFromAndCall(a0, rewardDistributor.address, value, data, {from: a0});
	}

	// describe("ether holder reward distributor", function() {
	// 	describe("deployment and initialization", function() {
	// 		beforeEach(async function() {
	// 			({shares: sharesContract} = await deploy_shares_ETH(a0));
	// 			rewardDistributor = await deploy_holders_rewards_distributor(a0);
	// 		});
	// 		it("fails, if try to initialize contract twice", async function() {
	// 			await rewardDistributor.initializeSharesContractAddressIfRequired(sharesContract.address, {from: a0});
	// 			await expectRevert(
	// 				rewardDistributor.initializeSharesContractAddressIfRequired(a0, {from: a0}),
	// 				"already initialized"
	// 			);
	// 		});

	// 		describe("success, otherwise", function() {
	// 			beforeEach(async function() {
	// 				await rewardDistributor.initializeSharesContractAddressIfRequired(sharesContract.address, {from: a0});
	// 			});

	// 			it("bonding curve address is set correctly", async function() {
	// 				expect(await rewardDistributor.sharesContractAddress()).to.equal(sharesContract.address);
	// 			});
	// 			it("payment token is set correctly", async function() {
	// 				expect(await rewardDistributor.getPaymentToken()).to.equal(ZERO_ADDRESS);
	// 			});
	// 		});
	// 	});
	// 	describe("register trade", function() {
	// 		beforeEach(async function() {
	// 			rewardDistributor = await deploy_holders_rewards_distributor(a0);
	// 		});
	// 		describe("when eoa/contract other then share contract try to register trade", function() {
	// 			beforeEach(async function() {
	// 				await rewardDistributor.initializeSharesContractAddressIfRequired(sharesContract.address, {from: a0});
	// 			});
	// 			it("fails to register BUY trade", async function() {
	// 				await expectRevert(buyShareEth(rewardDistributor, a1, '1', 0), "not allowed");
	// 			});
	// 			it("fails to register SELL trade", async function() {
	// 				await expectRevert(sellShareEth(rewardDistributor, a1, '1', 0), "not allowed");
	// 			});
	// 		});
	// 		describe("succeed, other wise", function() {
	// 			beforeEach(async function() {
	// 				await rewardDistributor.initializeSharesContractAddressIfRequired(a0, {from: a0});
	// 			});
	// 			describe("succeed, BUY trade registered", function() {
	// 				let receipt;
	// 				beforeEach(async function() {
	// 					receipt = await buyShareEth(rewardDistributor, a1, '1', 0);
	// 				});

	// 				it("number of share registered is as expected", async function() {
	// 					const userDetails = await rewardDistributor.userInfo(a1);
	// 					expect(await userDetails.shares).to.be.bignumber.that.equals(new BN(1));
	// 				});
	// 				it("'SharesTraded' event is emitted", async function() {
	// 					await expectEvent.inTransaction(receipt.transactionHash, rewardDistributor, "SharesTraded", {
	// 						trader: a1,
	// 						isBuy: true,
	// 						sharesAmount: new BN(1)
	// 					});
	// 				});
	// 			});
	// 			describe("succeed, SELL event registered", function() {
	// 				let receipt;
	// 				beforeEach(async function() {
	// 					await buyShareEth(rewardDistributor, a1, '5', 0);
	// 					receipt = await sellShareEth(rewardDistributor, a1, '1', deposit_value);
	// 				});
	// 				it("number of share registered is as expected", async function() {
	// 					const userDetails = await rewardDistributor.userInfo(a1);
	// 					expect(await userDetails.shares).to.be.bignumber.that.equals(new BN(4));
	// 				});
	// 				it("'SharesTraded' event is emitted", async function() {
	// 					await expectEvent.inTransaction(receipt.transactionHash, rewardDistributor, "SharesTraded", {
	// 						trader: a1,
	// 						isBuy: false,
	// 						sharesAmount: new BN(1)
	// 					});
	// 				});
	// 			});
	// 			describe("try to sell more amount then registered amount", function() {
	// 				beforeEach(async function() {
	// 					await buyShareEth(rewardDistributor, a1, '1', 0);
	// 				});
	// 				it("fails to registered sell trade amount more then buy trade amount", async function() {
	// 					await expectRevert(sellShareEth(rewardDistributor, a1, '2', 0), "amount must be <= registered amount");
	// 				});
	// 			});
	// 		});
	// 	});
	// 	describe("reward distribution", function() {
	// 		beforeEach(async function() {
	// 			rewardDistributor = await deploy_holders_rewards_distributor(a0, ZERO_ADDRESS, a0);
	// 		});
	// 		describe("try sending ether to ether holder reward distributor", function() {
	// 			beforeEach(async function() {
	// 				await buyShareEth(rewardDistributor, a1, '1', 0);
	// 			});
	// 			it("succeed, sent ether direct via call", async function() {
	// 				await web3.eth.sendTransaction({
	// 					to: rewardDistributor.address,
	// 					value: deposit_value, // Sends exactly 1.0 ether
	// 					from: a0
	// 				});
	// 				const rewardDistributorBal = await web3.eth.getBalance(rewardDistributor.address)
	// 				expect(rewardDistributorBal).to.be.bignumber.that.equals(deposit_value);

	// 			});
	// 			it("succeed, sent ether via call with data", async function() {
	// 				await buyShareEth(rewardDistributor, a1, '1', deposit_value);
	// 				const rewardDistributorBal = await web3.eth.getBalance(rewardDistributor.address)
	// 				expect(rewardDistributorBal).to.be.bignumber.that.equals(deposit_value);
	// 			});
	// 		});
	// 		describe("validate reward distributing while there is first single buy", function() {
	// 			beforeEach(async function() {
	// 				await buyShareEth(rewardDistributor, a1, '1', 0);
	// 			});
	// 			it("reward is correctly allocated to the first buyer", async function() {
	// 				expect(await rewardDistributor.pendingReward(a1)).to.be.bignumber.that.equals(new BN(0));
	// 			});
	// 		});
	// 		describe("validate reward distributing while there is first multiple buy", function() {
	// 			beforeEach(async function() {
	// 				await buyShareEth(rewardDistributor, a1, '4', deposit_value);
	// 			});
	// 			it("reward is correctly allocated to the first buyer", async function() {
	// 				expect(await rewardDistributor.pendingReward(a1)).to.be.bignumber.that.equals(deposit_value);
	// 			});
	// 		});
	// 		describe("validate reward distributing while there is multiple buy", function() {
	// 			beforeEach(async function() {
	// 				await buyShareEth(rewardDistributor, a1, '1', 0);
	// 				await buyShareEth(rewardDistributor, a2, '1', deposit_value);
	// 				await web3.eth.sendTransaction({
	// 					to: rewardDistributor.address,
	// 					value: deposit_value, // Sends exactly 1.0 ether
	// 					from: a0
	// 				});
	// 			});
	// 			it("reward is correctly allocated to the first buyer", async function() {
	// 				const amount = deposit_value.add(deposit_value.divn(2));
	// 				expect(await rewardDistributor.pendingReward(a1)).to.be.bignumber.that.equals(amount);
	// 			});
	// 			it("reward is correctly allocated to the second buyer", async function() {
	// 				const amount = deposit_value.divn(2);
	// 				expect(await rewardDistributor.pendingReward(a2)).to.be.bignumber.that.equals(amount);
	// 			});
	// 			it("reward is correctly allocated to the Third buyer", async function() {
	// 				await buyShareEth(rewardDistributor, a3, '1', 0);
	// 				await web3.eth.sendTransaction({
	// 					to: rewardDistributor.address,
	// 					value: deposit_value, // Sends exactly 1.0 ether
	// 					from: a0
	// 				});
	// 				const amount = deposit_value.divn(3);
	// 				expect(await rewardDistributor.pendingReward(a3)).to.be.bignumber.that.equals(amount);
	// 			});
	// 		});
	// 		describe("validate reward distributing when single user hold multiple share", function() {
	// 			beforeEach(async function() {
	// 				await buyShareEth(rewardDistributor, a1, '1', 0);
	// 				await buyShareEth(rewardDistributor, a2, '2', deposit_value);
	// 				await web3.eth.sendTransaction({
	// 					to: rewardDistributor.address,
	// 					value: deposit_value, // Sends exactly 1.0 ether
	// 					from: a0
	// 				});
	// 			});
	// 			it("reward is correctly allocated to the first buyer", async function() {
	// 				const amount = deposit_value.add(deposit_value.divn(3));
	// 				expect(await rewardDistributor.pendingReward(a1)).to.be.bignumber.that.equals(amount);
	// 			});
	// 			it("reward is correctly allocated to the second buyer", async function() {
	// 				const amount = deposit_value.muln(2).divn(3);
	// 				expect(await rewardDistributor.pendingReward(a2)).to.be.bignumber.that.equals(amount);
	// 			});
	// 		});
	// 	});
	// 	describe("reward claim", function() {
	// 		beforeEach(async function() {
	// 			rewardDistributor = await deploy_holders_rewards_distributor(a0, ZERO_ADDRESS, a0);
	// 			await buyShareEth(rewardDistributor, a1, '1', 0);
	// 			await web3.eth.sendTransaction({
	// 				to: rewardDistributor.address,
	// 				value: deposit_value, // Sends exactly 1.0 ether
	// 				from: a0
	// 			});
	// 		});
	// 		it("fails, if user try to claim reward if reward is not allocated", async function() {
	// 			await expectRevert(rewardDistributor.claimTheReward({from: a2}), "Nothing to claim");
	// 		});
	// 		it("fails, if user try to claim reward twice ", async function() {
	// 			await rewardDistributor.claimTheReward({from: a1});
	// 			await expectRevert(rewardDistributor.claimTheReward({from: a1}), "Nothing to claim");
	// 		});
	// 		describe("succeed, otherwise", function() {
	// 			beforeEach(async function() {
	// 				await buyShareEth(rewardDistributor, a2, '1', 0);
	// 				await web3.eth.sendTransaction({
	// 					to: rewardDistributor.address,
	// 					value: deposit_value, // Sends exactly 1.0 ether
	// 					from: a0
	// 				});
	// 			});
	// 			describe("first user try to claim reward", function() {
	// 				let claimedAmount, receipt, pendingClaimedAmount;
	// 				beforeEach(async function() {
	// 					let balBeforeTx = new BN(await web3.eth.getBalance(a1));
	// 					pendingClaimedAmount = await rewardDistributor.pendingReward(a1);
	// 					receipt = await rewardDistributor.claimTheReward({from: a1});

	// 					const balAfterTx = new BN(await web3.eth.getBalance(a1));
	// 					const transactionCost = new BN(receipt.receipt.gasUsed * receipt.receipt.effectiveGasPrice);
	// 					balBeforeTx = balBeforeTx.sub(transactionCost);
	// 					claimedAmount = balAfterTx.sub(balBeforeTx);
	// 				});
	// 				it("reward credited to user correctly", async function() {
	// 					expect(claimedAmount).to.be.bignumber.that.equals(pendingClaimedAmount);
	// 				});
	// 				it("user claimed reward amount is set correctly", async function() {
	// 					const userDetails = await rewardDistributor.userInfo(a1);
	// 					expect(userDetails.claimedAmount).to.be.bignumber.that.equals(claimedAmount);
	// 				});
	// 				it("user unclaimed reward amount is set correctly", async function() {
	// 					expect(await rewardDistributor.pendingReward(a1)).to.be.bignumber.that.equals(new BN(0));
	// 				});
	// 				it("'RewardClaimed' event is emitted", async function() {
	// 					expectEvent(receipt, "RewardClaimed", {
	// 						holder: a1,
	// 						rewardAmount: claimedAmount
	// 					});
	// 				});
	// 			});
	// 			describe("second user try to claim reward", function() {
	// 				let claimedAmount, receipt, pendingClaimedAmount;
	// 				beforeEach(async function() {
	// 					let balBeforeTx = new BN(await web3.eth.getBalance(a2));
	// 					pendingClaimedAmount = await rewardDistributor.pendingReward(a2);
	// 					receipt = await rewardDistributor.claimTheReward({from: a2});

	// 					const balAfterTx = new BN(await web3.eth.getBalance(a2));
	// 					const transactionCost = new BN(receipt.receipt.gasUsed * receipt.receipt.effectiveGasPrice);
	// 					balBeforeTx = balBeforeTx.sub(transactionCost);
	// 					claimedAmount = balAfterTx.sub(balBeforeTx);
	// 				});
	// 				it("reward credited to user correctly", async function() {
	// 					expect(claimedAmount).to.be.bignumber.that.equals(pendingClaimedAmount);
	// 				});
	// 				it("user claimed reward amount is set correctly", async function() {
	// 					const userDetails = await rewardDistributor.userInfo(a2);
	// 					expect(userDetails.claimedAmount).to.be.bignumber.that.equals(claimedAmount);
	// 				});
	// 				it("user unclaimed reward amount is set correctly", async function() {
	// 					expect(await rewardDistributor.pendingReward(a2)).to.be.bignumber.that.equals(new BN(0));
	// 				});
	// 				it("'RewardClaimed' event is emitted", async function() {
	// 					expectEvent(receipt, "RewardClaimed", {
	// 						holder: a2,
	// 						rewardAmount: claimedAmount
	// 					});
	// 				});
	// 			});
	// 			describe("all user try to claim reward", function() {
	// 				let claimedAmount1, claimedAmount2;
	// 				let receipt1, receipt2;
	// 				let pendingClaimedAmount1, pendingClaimedAmount2;
	// 				beforeEach(async function() {
	// 					// first user
	// 					let balBeforeTx = new BN(await web3.eth.getBalance(a1));
	// 					pendingClaimedAmount1 = await rewardDistributor.pendingReward(a1);
	// 					receipt1 = await rewardDistributor.claimTheReward({from: a1});

	// 					let balAfterTx = new BN(await web3.eth.getBalance(a1));
	// 					let transactionCost = new BN(receipt1.receipt.gasUsed * receipt1.receipt.effectiveGasPrice);
	// 					balBeforeTx = balBeforeTx.sub(transactionCost);
	// 					claimedAmount1 = balAfterTx.sub(balBeforeTx);

	// 					// 2nd user
	// 					balBeforeTx = new BN(await web3.eth.getBalance(a2));
	// 					pendingClaimedAmount2 = await rewardDistributor.pendingReward(a2);
	// 					receipt2 = await rewardDistributor.claimTheReward({from: a2});

	// 					balAfterTx = new BN(await web3.eth.getBalance(a2));
	// 					transactionCost = new BN(receipt2.receipt.gasUsed * receipt2.receipt.effectiveGasPrice);
	// 					balBeforeTx = balBeforeTx.sub(transactionCost);
	// 					claimedAmount2 = balAfterTx.sub(balBeforeTx);
	// 				});
	// 				it("reward credited to all user correctly", async function() {
	// 					expect(claimedAmount1).to.be.bignumber.that.equals(pendingClaimedAmount1);
	// 					expect(claimedAmount2).to.be.bignumber.that.equals(pendingClaimedAmount2);
	// 				});
	// 				it("post claim ether holding of reward system is correct ", async function() {
	// 					expect(await web3.eth.getBalance(rewardDistributor.address)).to.be.bignumber.that.equals(new BN(0));
	// 				});
	// 			});
	// 		});
	// 	});
	// });
	// describe("erc20 holder reward distributor", function() {
	// 	beforeEach(async function() {
	// 		payment_token = await ali_erc20_deploy(a0);
	// 		({shares: sharesContract} = await deploy_shares_ERC20(a0));
	// 		rewardDistributor = await deploy_holders_rewards_distributor(a0, payment_token);
	// 	});
	// 	describe("deployment and initialization", function() {
	// 		it("fails, if try to initialize contract twice", async function() {
	// 			await rewardDistributor.initializeSharesContractAddressIfRequired(sharesContract.address, {from: a0});
	// 			await expectRevert(
	// 				rewardDistributor.initializeSharesContractAddressIfRequired(a0, {from: a0}),
	// 				"already initialized");
	// 		});
	// 		it("fails, if try to send erc20 token other allowed one", async function() {
	// 			const erc20Token = await ali_erc20_deploy(a0);
	// 			await expectRevert(
	// 				erc20Token.transferFromAndCall(a0, rewardDistributor.address, deposit_value, 0x0, {from: a0}),
	// 				"received event from wrong token");
	// 		});
	// 		it("fails, if try to send ether via call to erc20 reward distributor", async function() {
	// 			await expectRevert(
	// 				web3.eth.sendTransaction({
	// 					to: rewardDistributor.address,
	// 					value: deposit_value, // Sends exactly 1.0 ether
	// 					from: a0
	// 				}),
	// 				"not allowed");
	// 		});
	// 		it("fails, if try to send ether via call with data to ERC20 reward distributor", async function() {
	// 			// dummy buy data
	// 			const dummyData = web3.eth.abi.encodeParameters(['address', 'bool', 'uint256'], [a1, true, '1']);
	// 			await expectRevert(
	// 				web3.eth.sendTransaction({
	// 					to: rewardDistributor.address,
	// 					value: deposit_value, // Sends exactly 1.0 ether
	// 					data: dummyData,
	// 					from: a0
	// 				}),
	// 				"not an ETH reward distributor"
	// 			);
	// 		});
	// 		it("fails if data is malformed (more data)", async function() {
	// 			rewardDistributor = await deploy_holders_rewards_distributor(a0);
	// 			await rewardDistributor.initializeSharesContractAddressIfRequired(a0, {from: a0});
	// 			await expectRevert(
	// 				web3.eth.sendTransaction({
	// 					to: rewardDistributor.address,
	// 					value: deposit_value, // Sends exactly 1.0 ether
	// 					data: web3.eth.abi.encodeParameters(['address', 'bool', 'bool', 'uint256'], [a1, true, true, '10']),
	// 					from: a0,
	// 				}),
	// 				"malformed sync message"
	// 			);
	// 		});
	// 		it("fails if data is malformed (less data)", async function() {
	// 			rewardDistributor = await deploy_holders_rewards_distributor(a0);
	// 			await rewardDistributor.initializeSharesContractAddressIfRequired(a0, {from: a0});
	// 			await expectRevert(
	// 				web3.eth.sendTransaction({
	// 					to: rewardDistributor.address,
	// 					value: deposit_value, // Sends exactly 1.0 ether
	// 					data: web3.eth.abi.encodeParameters(['address', 'bool'], [a1, true]),
	// 					from: a0,
	// 				}),
	// 				"malformed sync message"
	// 			);
	// 		});
	// 		it("fails if data is malformed (wrong data)", async function() {
	// 			rewardDistributor = await deploy_holders_rewards_distributor(a0);
	// 			await rewardDistributor.initializeSharesContractAddressIfRequired(a0, {from: a0});
	// 			await expectRevert.unspecified(web3.eth.sendTransaction({
	// 				to: rewardDistributor.address,
	// 				value: deposit_value, // Sends exactly 1.0 ether
	// 				data: web3.eth.abi.encodeParameters(['address', 'uint256', 'uint256'], [a1, '10', '10']),
	// 				from: a0,
	// 			}));
	// 		});
	// 		it("fails if data is malformed (wrong data 2)", async function() {
	// 			rewardDistributor = await deploy_holders_rewards_distributor(a0);
	// 			await rewardDistributor.initializeSharesContractAddressIfRequired(a0, {from: a0});
	// 			await expectRevert.unspecified(web3.eth.sendTransaction({
	// 				to: rewardDistributor.address,
	// 				value: deposit_value, // Sends exactly 1.0 ether
	// 				data: web3.eth.abi.encodeParameters(['uint256', 'bool', 'uint256'], [MAX_UINT256, true, '10']),
	// 				from: a0,
	// 			}));
	// 		});
	// 		describe("success, otherwise", function() {
	// 			beforeEach(async function() {
	// 				await rewardDistributor.initializeSharesContractAddressIfRequired(sharesContract.address, {from: a0});
	// 			});

	// 			it("bonding curve address is set correctly", async function() {
	// 				expect(await rewardDistributor.sharesContractAddress()).to.equal(sharesContract.address);
	// 			});
	// 			it("payment token is set correctly", async function() {
	// 				expect(await rewardDistributor.getPaymentToken()).to.equal(payment_token.address);
	// 			});
	// 		});
	// 	});
	// 	describe("register trade", function() {
	// 		describe("when eoa/contract other then share contract try to register trade", function() {
	// 			beforeEach(async function() {
	// 				await rewardDistributor.initializeSharesContractAddressIfRequired(sharesContract.address, {from: a0});
	// 			});
	// 			it("fails to register BUY trade", async function() {
	// 				await expectRevert(buyShareErc20(rewardDistributor, payment_token, a1, '1', 0), "not allowed");
	// 			});
	// 			it("fails to register SELL trade", async function() {
	// 				await expectRevert(sellShareErc20(rewardDistributor, payment_token, a1, '1', 0), "not allowed");
	// 			});
	// 		});
	// 		describe("succeed, other wise", function() {
	// 			beforeEach(async function() {
	// 				await rewardDistributor.initializeSharesContractAddressIfRequired(a0, {from: a0});
	// 			});
	// 			describe("succeed, BUY trade registered", function() {
	// 				let receipt;
	// 				beforeEach(async function() {
	// 					receipt = await buyShareErc20(rewardDistributor, payment_token, a1, '1', 0);
	// 				});

	// 				it("number of share registered is as expected", async function() {
	// 					const userDetails = await rewardDistributor.userInfo(a1);
	// 					expect(await userDetails.shares).to.be.bignumber.that.equals(new BN(1));
	// 				});
	// 				it("'SharesTraded' event is emitted", async function() {
	// 					await expectEvent.inTransaction(receipt.tx, rewardDistributor, "SharesTraded", {
	// 						trader: a1,
	// 						isBuy: true,
	// 						sharesAmount: new BN(1)
	// 					});
	// 				});
	// 			});
	// 			describe("succeed, SELL event registered", function() {
	// 				let receipt;
	// 				beforeEach(async function() {
	// 					await buyShareErc20(rewardDistributor, payment_token, a1, '5', 0);
	// 					receipt = await sellShareErc20(rewardDistributor, payment_token, a1, '1', deposit_value);
	// 				});
	// 				it("number of share registered is as expected", async function() {
	// 					const userDetails = await rewardDistributor.userInfo(a1);
	// 					expect(await userDetails.shares).to.be.bignumber.that.equals(new BN(4));
	// 				});
	// 				it("'SharesTraded' event is emitted", async function() {
	// 					await expectEvent.inTransaction(receipt.tx, rewardDistributor, "SharesTraded", {
	// 						trader: a1,
	// 						isBuy: false,
	// 						sharesAmount: new BN(1)
	// 					});
	// 				});
	// 			});
	// 			describe("try to sell more amount then registered amount", function() {
	// 				beforeEach(async function() {
	// 					await buyShareErc20(rewardDistributor, payment_token, a1, '1', 0);
	// 				});
	// 				it("fails to registered sell trade amount more then buy trade amount", async function() {
	// 					await expectRevert(sellShareErc20(rewardDistributor, payment_token, a1, '2', 0), "amount must be <= registered amount");
	// 				});
	// 			});
	// 		});
	// 	});
	// 	describe("reward distribution", function() {
	// 		beforeEach(async function() {
	// 			await rewardDistributor.initializeSharesContractAddressIfRequired(a0, {from: a0});
	// 		});
	// 		describe("try sending ether to ether holder reward distributor", function() {
	// 			beforeEach(async function() {
	// 				await buyShareErc20(rewardDistributor, payment_token, a1, '1', 0);
	// 			});
	// 			it("succeed, sent ether via transferFrom with data", async function() {
	// 				await buyShareErc20(rewardDistributor, payment_token, a1, '1', deposit_value);
	// 				const rewardDistributorBal = await payment_token.balanceOf(rewardDistributor.address)
	// 				expect(rewardDistributorBal).to.be.bignumber.that.equals(deposit_value);
	// 			});
	// 		});
	// 		describe("validate reward distributing while there is first single buy", function() {
	// 			beforeEach(async function() {
	// 				await buyShareErc20(rewardDistributor, payment_token, a1, '1', 0);
	// 			});
	// 			it("reward is correctly allocated to the first buyer", async function() {
	// 				expect(await rewardDistributor.pendingReward(a1)).to.be.bignumber.that.equals(new BN(0));
	// 			});
	// 		});
	// 		describe("validate reward distributing while there is first multiple buy", function() {
	// 			beforeEach(async function() {
	// 				await buyShareErc20(rewardDistributor, payment_token, a1, '4', deposit_value);
	// 			});
	// 			it("reward is correctly allocated to the first buyer", async function() {
	// 				expect(await rewardDistributor.pendingReward(a1)).to.be.bignumber.that.equals(deposit_value);
	// 			});
	// 		});
	// 		describe("validate reward distributing while there is multiple buy event", function() {
	// 			beforeEach(async function() {
	// 				await buyShareErc20(rewardDistributor, payment_token, a1, '1', 0);
	// 				await buyShareErc20(rewardDistributor, payment_token, a2, '1', deposit_value);
	// 				//just send token to distribute among all holder
	// 				await buyShareErc20(rewardDistributor, payment_token, a1, '0', deposit_value);
	// 			});
	// 			it("reward is correctly allocated to the first buyer", async function() {
	// 				const amount = deposit_value.add(deposit_value.divn(2));
	// 				expect(await rewardDistributor.pendingReward(a1)).to.be.bignumber.that.equals(amount);
	// 			});
	// 			it("reward is correctly allocated to the second buyer", async function() {
	// 				const amount = deposit_value.divn(2);
	// 				expect(await rewardDistributor.pendingReward(a2)).to.be.bignumber.that.equals(amount);
	// 			});
	// 			it("reward is correctly allocated to the Third buyer", async function() {
	// 				await buyShareErc20(rewardDistributor, payment_token, a3, '1', 0);
	// 				//just send token to distribute among all holder
	// 				await buyShareErc20(rewardDistributor, payment_token, a1, '0', deposit_value);
	// 				const amount = deposit_value.divn(3);
	// 				expect(await rewardDistributor.pendingReward(a3)).to.be.bignumber.that.equals(amount);
	// 			});
	// 		});
	// 		describe("validate reward distributing when single user hold multiple share", function() {
	// 			beforeEach(async function() {
	// 				await buyShareErc20(rewardDistributor, payment_token, a1, '1', 0);
	// 				await buyShareErc20(rewardDistributor, payment_token, a2, '2', deposit_value);
	// 				//just send token to distribute among all holder
	// 				await buyShareErc20(rewardDistributor, payment_token, a1, '0', deposit_value);
	// 			});
	// 			it("reward is correctly allocated to the first buyer", async function() {
	// 				const amount = deposit_value.add(deposit_value.divn(3));
	// 				expect(await rewardDistributor.pendingReward(a1)).to.be.bignumber.that.equals(amount);
	// 			});
	// 			it("reward is correctly allocated to the second buyer", async function() {
	// 				const amount = deposit_value.muln(2).divn(3);
	// 				expect(await rewardDistributor.pendingReward(a2)).to.be.bignumber.that.equals(amount);
	// 			});
	// 		});
	// 	});
	// 	describe("reward claim", function() {
	// 		beforeEach(async function() {
	// 			await rewardDistributor.initializeSharesContractAddressIfRequired(a0, {from: a0});
	// 			await buyShareErc20(rewardDistributor, payment_token, a1, '1', 0);
	// 			//just send token to distribute among all holder
	// 			await buyShareErc20(rewardDistributor, payment_token, a1, '0', deposit_value);
	// 		});
	// 		it("fails, if user try to claim reward if reward is not allocated", async function() {
	// 			await expectRevert(rewardDistributor.claimTheReward({from: a2}), "Nothing to claim");
	// 		});
	// 		it("fails, if user try to claim reward twice ", async function() {
	// 			await rewardDistributor.claimTheReward({from: a1});
	// 			await expectRevert(rewardDistributor.claimTheReward({from: a1}), "Nothing to claim");
	// 		});
	// 		describe("succeed, otherwise", function() {
	// 			beforeEach(async function() {
	// 				await buyShareErc20(rewardDistributor, payment_token, a2, '1', 0);
	// 				//just send token to distribute among all holder
	// 				await buyShareErc20(rewardDistributor, payment_token, a1, '0', deposit_value);
	// 			});
	// 			describe("first user try to claim reward", function() {
	// 				let claimedAmount, receipt, pendingClaimedAmount;
	// 				beforeEach(async function() {
	// 					pendingClaimedAmount = await rewardDistributor.pendingReward(a1);
	// 					receipt = await rewardDistributor.claimTheReward({from: a1});
	// 					claimedAmount = await payment_token.balanceOf(a1);
	// 				});
	// 				it("reward credited to user correctly", async function() {
	// 					expect(claimedAmount).to.be.bignumber.that.equals(pendingClaimedAmount);
	// 				});
	// 				it("user claimed reward amount is set correctly", async function() {
	// 					const userDetails = await rewardDistributor.userInfo(a1);
	// 					expect(userDetails.claimedAmount).to.be.bignumber.that.equals(claimedAmount);
	// 				});
	// 				it("user unclaimed reward amount is set correctly", async function() {
	// 					expect(await rewardDistributor.pendingReward(a1)).to.be.bignumber.that.equals(new BN(0));
	// 				});
	// 				it("'RewardClaimed' event is emitted", async function() {
	// 					expectEvent(receipt, "RewardClaimed", {
	// 						holder: a1,
	// 						rewardAmount: claimedAmount
	// 					});
	// 				});
	// 			});
	// 			describe("second user try to claim reward", function() {
	// 				let claimedAmount, receipt, pendingClaimedAmount;
	// 				beforeEach(async function() {
	// 					pendingClaimedAmount = await rewardDistributor.pendingReward(a2);
	// 					receipt = await rewardDistributor.claimTheReward({from: a2});
	// 					claimedAmount = await payment_token.balanceOf(a2);
	// 				});
	// 				it("reward credited to user correctly", async function() {
	// 					expect(claimedAmount).to.be.bignumber.that.equals(pendingClaimedAmount);
	// 				});
	// 				it("user claimed reward amount is set correctly", async function() {
	// 					const userDetails = await rewardDistributor.userInfo(a2);
	// 					expect(userDetails.claimedAmount).to.be.bignumber.that.equals(claimedAmount);
	// 				});
	// 				it("user unclaimed reward amount is set correctly", async function() {
	// 					expect(await rewardDistributor.pendingReward(a2)).to.be.bignumber.that.equals(new BN(0));
	// 				});
	// 				it("'RewardClaimed' event is emitted", async function() {
	// 					expectEvent(receipt, "RewardClaimed", {
	// 						holder: a2,
	// 						rewardAmount: claimedAmount
	// 					});
	// 				});
	// 			});
	// 			describe("all user try to claim reward", function() {
	// 				let claimedAmount1, claimedAmount2;
	// 				let receipt1, receipt2;
	// 				let pendingClaimedAmount1, pendingClaimedAmount2;
	// 				beforeEach(async function() {
	// 					// first user
	// 					pendingClaimedAmount1 = await rewardDistributor.pendingReward(a1);
	// 					receipt1 = await rewardDistributor.claimTheReward({from: a1});
	// 					claimedAmount1 = await payment_token.balanceOf(a1);

	// 					// 2nd user
	// 					pendingClaimedAmount2 = await rewardDistributor.pendingReward(a2);
	// 					receipt2 = await rewardDistributor.claimTheReward({from: a2});
	// 					claimedAmount2 = await payment_token.balanceOf(a2);
	// 				});
	// 				it("reward credited to all user correctly", async function() {
	// 					expect(claimedAmount1).to.be.bignumber.that.equals(pendingClaimedAmount1);
	// 					expect(claimedAmount2).to.be.bignumber.that.equals(pendingClaimedAmount2);
	// 				});
	// 				it("post claim ether holding of reward system is correct ", async function() {
	// 					expect(await payment_token.balanceOf(rewardDistributor.address)).to.be.bignumber.that.equals(new BN(0));
	// 				});
	// 			});
	// 		});
	// 	});
	// });
});

// AI Protocol: Hardhat time differs from Date.now(), use this function to obtain it
async function now() {
	const latestBlock = await web3.eth.getBlock("latest");
	return latestBlock.timestamp;
}
