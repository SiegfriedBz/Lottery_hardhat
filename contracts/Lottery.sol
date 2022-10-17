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
    uint256 private immutable i_fee;
    address[] private players;

    modifier onlyOwner() {
        if (i_owner != msg.sender) {
            revert Lottery__UnAuthorized();
        }
        _;
    }

    constructor(uint256 _fee) {
        i_owner = msg.sender;
        i_fee = _fee;
    }

    /**
     * @notice
     * check if amount sent is correct
     * adds msg.sender to the players array
     */
    function enterLottery() external payable {
        if (msg.value != i_fee) {
            revert Lottery__NeedToSendCorrectAmount();
        }
        players.push(msg.sender);
    }

    /**
     * @notice Getter for front end
     * returns the entrance fee
     */
    function getFee() public view returns (uint256) {
        return i_fee;
    }

    /**
     * @notice Getter for front end
     * returns the players array
     */
    function getPlayers() public view returns (address[] memory) {
        return players;
    }
}
