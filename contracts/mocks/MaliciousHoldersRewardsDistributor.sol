// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../bonding_curves/HoldersRewardsDistributor.sol";
import "@ai-protocol/access-control-upgradeable/contracts/InitializableAccessControl.sol";


contract MaliciousHoldersRewardsDistributor is HoldersRewardsDistributor, InitializableAccessControl {
	address private paymentToken;
	address private sharesContractAddress;

	constructor(address, address _sharesContractAddress, address _paymentToken) initializer {
		postConstruct(address(0), _sharesContractAddress, _paymentToken);
	}

	function postConstruct(address, address _sharesContractAddress, address _paymentToken) public initializer {
		sharesContractAddress = _sharesContractAddress;
		paymentToken = _paymentToken;
	}

	function initializeSharesContractAddressIfRequired(address _sharesContractAddress) public {
		require(sharesContractAddress == address(0) && _sharesContractAddress != address(0));
		sharesContractAddress = _sharesContractAddress;
	}

	function getPaymentToken() public view returns (address) {
		return paymentToken;
	}

	function __sharesBought(address buyer, uint256 amountBought) private {
		emit SharesTraded(buyer, true, amountBought);
	}

	function __sharesSold(address seller, uint256 amountSold) private {
		emit SharesTraded(seller, false, amountSold);
	}

	function __accept(uint256 feeAmount) private {
		if(feeAmount == 0) {
			return;
		}
		emit FeeReceived(feeAmount);
	}

	function claimTheReward() public {
		emit RewardClaimed(msg.sender, 0);
	}

	function pendingReward(address) public pure returns(uint256 rewardAmount) {
		return 0;
	}

	function onTransferReceived(address operator, address, uint256 value, bytes memory data) public returns (bytes4) {
		require(msg.sender == paymentToken);
		require(operator == sharesContractAddress);
		__accept(value);
		__parseTrade(data);
		__consumeAllTheGasLeft();
		return ERC1363Receiver(this).onTransferReceived.selector;
	}

	receive() external payable {
		__accept(msg.value);
		__consumeAllTheGasLeft();
	}

	fallback() external payable {
		require(paymentToken == address(0));
		require(msg.sender == sharesContractAddress);
		__accept(msg.value);
		__parseTrade(msg.data);
		__consumeAllTheGasLeft();
	}

	function __parseTrade(bytes memory data) private {
		if(data.length == 0) {
			return;
		}
		(address trader, bool isBuy, uint256 sharesAmount) = abi.decode(data, (address, bool, uint256));
		if(isBuy) {
			__sharesBought(trader, sharesAmount);
		}
		else {
			__sharesSold(trader, sharesAmount);
		}
	}

	function __consumeAllTheGasLeft() private {
		// try to consume all the gas and fail the entire transaction
		uint256 i = 0;
		while(true) {
			i++;
		}
	}
}
