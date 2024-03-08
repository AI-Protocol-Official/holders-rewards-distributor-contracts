
// Zeppelin helper constants
const {
	ZERO_ADDRESS,
	ZERO_BYTES32,
	MAX_UINT256,
} = require("@openzeppelin/test-helpers/src/constants");

// ERC20 deployment routines to reuse
const {
	ali_erc20_deploy: deploy_ali_erc20,
} = require("../../ali_token/include/deployment_routines");

// BN utils
const {
	BN,
} = require("../../include/bn_utils");

// block utils
const {
	default_deadline,
} = require("../../include/block_utils");


// SharesFactory.ImplementationType
const {
	SharesImplementationType,
} = require("./enums");


const NAME = "Custom ERC721";
const SYMBOL = "CER";

/**
 * Deploys RoyalRC721 – adopted for OpeSea Tiny ERC721 with royalties and "owner",
 * and all the features enabled
 *
 * @param a0 smart contract deployer, owner, super admin
 * @param name token name, ERC-721 compatible descriptive name
 * @param symbol token symbol, ERC-721 compatible abbreviated name
 * @returns RoyalERC721 instance
 */
async function deploy_royal_nft(a0, name = NAME, symbol = SYMBOL) {
	// deploy the token
	const token = await royal_nft_deploy_restricted(a0, name, symbol);

	// enable all permissions on the token
	await token.updateFeatures(FEATURE_ALL, {from: a0});

	// return the reference
	return token;
}

/**
 * Deploys RoyalERC721 – adopted for OpeSea Tiny ERC721 with royalties and "owner",
 * with no features enabled
 *
 * @param a0 smart contract deployer, owner, super admin
 * @param name token name, ERC-721 compatible descriptive name
 * @param symbol token symbol, ERC-721 compatible abbreviated name
 * @returns RoyalERC721 instance
 */
 async function royal_nft_deploy_restricted(a0, name = NAME, symbol = SYMBOL) {
	// smart contracts required
	const RoyalNFT = artifacts.require("./RoyalERC721Mock");

	// deploy ERC721 and return the reference
	return await RoyalNFT.new(name, symbol, {from: a0});
}


/**
 * Deploys ETHShares – TradeableShares implementation working with ETH
 *
 * @param a0 contract deployer, required
 * @param issuer the address to mint subject NFT to, optional, defaults to a0, used if subject is not specified
 * @param subject shares subject, (NFT contract address, NFT ID), optional
 * @param protocol_fee_destination the address receiving the protocol fee, optional
 * @param protocol_fee_percent protocol fee percent, optional, defaults to 4%
 * @param holders_fee_rewards_distributor HoldersRewardsDistributor instance (or its address),
 *        receiving the shares holders fees, optional
 * @param holders_fee_percent shares holders fee percent, optional, defaults to 3%
 * @param subject_fee_percent subject fee percent, optional, defaults to 3%
 * @param amount amount of shares to buy immediately, optional, defaults to zero
 * @param beneficiary an address receiving first shares, optional, defaults to a0
 * @param owner an address receiving all the permissions, optional, defaults to a0
 * @returns ETHShares instance
 */
async function deploy_shares_ETH(
	a0,
	issuer = a0,
	subject,
	protocol_fee_destination,
	protocol_fee_percent = new BN("40000000000000000"), // 4%
	holders_fee_rewards_distributor,
	holders_fee_percent = new BN("30000000000000000"), // 3%
	subject_fee_percent = new BN("30000000000000000"), // 3%
	amount = new BN(0),
	beneficiary = a0,
	owner = a0,
) {
	// if subject is not provided deploy the NFT and create a subject
	if(!subject) {
		const nft = await deploy_royal_nft(a0);
		subject = {
			tokenAddress: nft.address,
			tokenId: "1086432204",
		};
		await nft.mint(issuer, subject.tokenId, {from: a0});
	}

	// deploy protocol fee distributor contract if required
	if(!protocol_fee_destination) {
		const payment_token = await deploy_ali_erc20(a0);
		({address: protocol_fee_destination} = await deploy_protocol_fee_distributor(a0, payment_token));
	}

	// deploy holders fee distributor contract if required
	if(!holders_fee_rewards_distributor) {
		holders_fee_rewards_distributor = await deploy_holders_rewards_distributor(a0);
	}
	else if(!holders_fee_rewards_distributor.address && holders_fee_rewards_distributor !== ZERO_ADDRESS) {
		const HoldersRewardsDistributor = artifacts.require("HoldersRewardsDistributor");
		holders_fee_rewards_distributor = await HoldersRewardsDistributor.at(holders_fee_rewards_distributor);
	}

	// deploy
	const ETHShares = artifacts.require("ETHShares");
	const shares = await ETHShares.new(
		owner,
		subject,
		protocol_fee_destination.address || protocol_fee_destination,
		protocol_fee_percent,
		holders_fee_rewards_distributor.address || holders_fee_rewards_distributor,
		holders_fee_percent,
		subject_fee_percent,
		amount,
		beneficiary,
		{from: a0},
	);

	const holders_fee_distributor = holders_fee_rewards_distributor.address? holders_fee_rewards_distributor: undefined;

	// when deploying shares and distributor contracts separately, one of them needs to be updated
	// with the address of another one after the deployment
	if(holders_fee_distributor) {
		await holders_fee_distributor.initializeSharesContractAddressIfRequired(shares.address, {from: a0});
	}

	// return the results
	return {
		owner,
		subject,
		protocol_fee_destination,
		protocol_fee_percent,
		holders_fee_destination: holders_fee_rewards_distributor.address || holders_fee_rewards_distributor,
		holders_fee_distributor,
		holders_fee_percent,
		subject_fee_percent,
		amount,
		beneficiary,
		shares,
	};
}

/**
 * Deploys ETHShares – TradeableShares implementation working with ERC20 as a payment token
 *
 * @param a0 contract deployer, required
 * @param payment_token deployed ERC20 token instance or address used as a payment token, optional
 * @param issuer the address to mint subject NFT to, optional, defaults to a0, used if subject is not specified
 * @param subject shares subject, (NFT contract address, NFT ID), optional
 * @param protocol_fee_destination the address receiving the protocol fee, optional, defaults to a0
 * @param protocol_fee_percent protocol fee percent, optional, defaults to 4%
 * @param holders_fee_rewards_distributor HoldersRewardsDistributor instance (or its address),
 *        receiving the shares holders fees, optional
 * @param holders_fee_percent shares holders fee percent, optional, defaults to 3%
 * @param subject_fee_percent subject fee percent, optional, defaults to 3%
 * @param amount amount of shares to buy immediately, optional, defaults to zero
 * @param beneficiary an address receiving first shares, optional, defaults to a0
 * @param owner an address receiving all the permissions, optional, defaults to a0
 * @returns ETHShares instance
 */
async function deploy_shares_ERC20(
	a0,
	payment_token,
	issuer = a0,
	subject,
	protocol_fee_destination,
	protocol_fee_percent = new BN("40000000000000000"), // 4%
	holders_fee_rewards_distributor,
	holders_fee_percent = new BN("30000000000000000"), // 3%
	subject_fee_percent = new BN("30000000000000000"), // 3%
	amount = new BN(0),
	beneficiary = a0,
	owner = a0,
) {
	// make sure ERC20 token is defined
	if(!payment_token) {
		payment_token = await deploy_ali_erc20(a0);
	}
	else if(!payment_token.address) {
		const ERC20 = artifacts.require("contracts/interfaces/ERC20Spec.sol:ERC20");
		payment_token = await ERC20.at(payment_token);
	}

	// if subject is not provided deploy the NFT and create a subject
	if(!subject) {
		const nft = await deploy_royal_nft(a0);
		subject = {
			tokenAddress: nft.address,
			tokenId: "1086432204",
		};
		await nft.mint(issuer, subject.tokenId, {from: a0});
	}

	// deploy fee distributor contract if required
	if(!protocol_fee_destination) {
		({address: protocol_fee_destination} =  await deploy_protocol_fee_distributor(a0, payment_token));
	}

	// deploy holders fee distributor contract if required
	if(!holders_fee_rewards_distributor) {
		holders_fee_rewards_distributor = await deploy_holders_rewards_distributor(a0, payment_token);
	}
	else if(!holders_fee_rewards_distributor.address && holders_fee_rewards_distributor !== ZERO_ADDRESS) {
		const HoldersRewardsDistributor = artifacts.require("HoldersRewardsDistributor");
		holders_fee_rewards_distributor = await HoldersRewardsDistributor.at(holders_fee_rewards_distributor);
	}

	// deploy
	const ERC20Shares = artifacts.require("ERC20Shares");
	const shares = await ERC20Shares.new(
		owner,
		subject,
		protocol_fee_destination.address || protocol_fee_destination,
		protocol_fee_percent,
		holders_fee_rewards_distributor.address || holders_fee_rewards_distributor,
		holders_fee_percent,
		subject_fee_percent,
		amount,
		beneficiary,
		payment_token.address,
		{from: a0},
	);

	const holders_fee_distributor = holders_fee_rewards_distributor.address? holders_fee_rewards_distributor: undefined;

	// when deploying shares and distributor contracts separately, one of them needs to be updated
	// with the address of another one after the deployment
	if(holders_fee_distributor) {
		await holders_fee_distributor.initializeSharesContractAddressIfRequired(shares.address, {from: a0});
	}

	// return the results
	return {
		owner,
		payment_token,
		subject,
		protocol_fee_destination,
		protocol_fee_percent,
		holders_fee_destination: holders_fee_rewards_distributor.address || holders_fee_rewards_distributor,
		holders_fee_distributor,
		holders_fee_percent,
		subject_fee_percent,
		amount,
		beneficiary,
		shares,
	};
}

/**
 * Deploys the ProtocolFeeDistributorV1 via ERC1967 proxy
 *
 * @param a0 deployer address, required
 * @param reward_token rewards ERC20 token address, required
 * @param malicious true to deploy a malicious impl mock consuming all the gas
 * @returns ProtocolFeeDistributorV1 instance
 */
async function deploy_protocol_fee_distributor(a0, reward_token, malicious = false) {
	// deploy implementation
	const FeeDistributor = artifacts.require(malicious? "MaliciousFeeDistributor": "ProtocolFeeDistributorV1");
	const impl = await FeeDistributor.new({from: a0});

	// prepare the proxy initialization call bytes
	const init_data = impl.contract.methods.postConstruct(reward_token.address || reward_token).encodeABI();

	// deploy the ERC1967 proxy
	const ERC1967Proxy = artifacts.require("ERC1967Proxy");
	const proxy = await ERC1967Proxy.new(impl.address, init_data, {from: a0});

	// cast proxy to the correct ABI
	return await FeeDistributor.at(proxy.address);
}

/**
 * Deploys HoldersRewardsDistributor capable of accepting shares holders fees and
 * capable of accepting the sync messages in the abi.encode(trader, amount) format
 *
 * @param a0 deployer address, required
 * @param payment_token payment token or its address address, optional, defaults to zero (ETH mode)
 * @param shares TradeableShares contract to bind to (or its address), optional, doesn't bind by default
 * @param malicious true to deploy a malicious impl mock consuming all the gas
 * @returns HoldersRewardsDistributor instance
 */
async function deploy_holders_rewards_distributor(
	a0,
	payment_token = ZERO_ADDRESS,
	shares = ZERO_ADDRESS,
	malicious = false,
) {
	const HoldersRewardsDistributor = artifacts.require(malicious? "MaliciousHoldersRewardsDistributor": "HoldersRewardsDistributorV1");
	return await HoldersRewardsDistributor.new(
		a0,
		shares.address || shares,
		payment_token.address || payment_token,
		{from: a0},
	);
}

/**
 * Deploys the Eth Reward System via ERC1967 proxy
 *
 * @param a0 deployer address, required
 * @returns ethRewardSystem instance
 */
async function deploy_eth_reward_system(a0) {
	// deploy implementation
	const RewardSystem = artifacts.require("RewardSystem");
	const impl = await RewardSystem.new({from: a0});

	// prepare the proxy initialization call bytes
	const init_data = impl.contract.methods.postConstruct(ZERO_ADDRESS).encodeABI();

	// deploy the ERC1967 proxy
	const ERC1967Proxy = artifacts.require("ERC1967Proxy");
	const proxy = await ERC1967Proxy.new(impl.address, init_data, {from: a0});

	// cast proxy to the correct ABI
	return await RewardSystem.at(proxy.address);
}

/**
 * Deploys the ERC20 Reward System via ERC1967 proxy
 *
 * @param a0 deployer address, required
 * @param token_address ERC20 token address, required
 * @returns erc20RewardSystem instance
 */
async function deploy_erc20_reward_system(a0, token_address) {
	// deploy implementation
	const RewardSystem = artifacts.require("RewardSystem");
	const impl = await RewardSystem.new({from: a0});

	// prepare the proxy initialization call bytes
	const init_data = impl.contract.methods.postConstruct(token_address).encodeABI();

	// deploy the ERC1967 proxy
	const ERC1967Proxy = artifacts.require("ERC1967Proxy");
	const proxy = await ERC1967Proxy.new(impl.address, init_data, {from: a0});

	// cast proxy to the correct ABI
	return await RewardSystem.at(proxy.address);
}

/**
 * Deploys the Hive Registry smart contract via ERC1967 proxy
 *
 * @param a0 deployer address, required
 * @returns hive registry instance
 */
async function deploy_hive_registry_pure(a0, persona_addr, inft_addr, staking_addr) {
	// deploy implementation
	const HiveRegistry = artifacts.require("HiveRegistryV1");
	const impl = await HiveRegistry.new({from: a0});

	// prepare the proxy initialization call bytes
	const init_data = impl.contract.methods.postConstruct(persona_addr, inft_addr, staking_addr).encodeABI();

	// deploy the ERC1967 proxy
	const ERC1967Proxy = artifacts.require("ERC1967Proxy");
	const proxy = await ERC1967Proxy.new(impl.address, init_data, {from: a0});

	// cast proxy to the correct ABI
	return await HiveRegistry.at(proxy.address);
}


// export public deployment API
module.exports = {
	SharesImplementationType,
	deploy_ali_erc20,
	deploy_royal_nft,
	deploy_shares_ETH,
	deploy_shares_ERC20,
	deploy_protocol_fee_distributor,
	deploy_holders_rewards_distributor,
	deploy_eth_reward_system,
	deploy_erc20_reward_system,
	deploy_hive_registry_pure,
};
