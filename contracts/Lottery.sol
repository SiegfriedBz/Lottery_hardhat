// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

error Lottery__UnAuthorized();
error Lottery__NeedToSendCorrectAmount();

// import "hardhat/console.sol";

// user can enter lottery by sending ether to this contract
// chainlink oracle vrf will pick a random number
// chainlink oracle keeper will call the function to pick a winner

contract Lottery {
    address private immutable i_owner;
    uint256 private immutable i_amount;
    address[] private players;

    modifier onlyOwner() {
        if (i_owner != msg.sender) {
            revert Lottery__UnAuthorized();
        }
        _;
    }

    constructor(uint256 _amount) {
        i_owner = msg.sender;
        i_amount = _amount;
    }

    function enterLottery() external payable {
        if (msg.value != i_amount) {
            revert Lottery__NeedToSendCorrectAmount();
        }
        players.push(msg.sender);
    }
}
