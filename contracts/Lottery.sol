// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

error Lottery__UnAuthorized();
error Lottery__NeedToSendCorrectAmount();

// import "hardhat/console.sol";

// Chainlink VRF
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

// Chainlink Keeper

/** @notice contract Lottery
// user can enter lottery by sending ether to this contract
// Chainlink VRF will pick a random number
// Chainlink Keeper will call the function to pick a winner
*/

contract Lottery is VRFConsumerBaseV2 {
    /* State Variables */
    address private immutable i_owner;
    uint256 private immutable i_fee;
    address payable[] private s_players;

    /* Events */
    event Lottery_Enter(address _player);

    modifier onlyOwner() {
        if (i_owner != msg.sender) {
            revert Lottery__UnAuthorized();
        }
        _;
    }

    constructor(uint256 _fee, address _vrfCoordinator)
        VRFConsumerBaseV2(_vrfCoordinator)
    {
        i_owner = msg.sender;
        i_fee = _fee;
    }

    /**
     * @notice
     * called by the ChainLink Keeper automatically
     */
    function requestRandomWinner() external {
        // request the random number
        // do smthg with the random number
        // ChainLink VRF = 2 trx process (more difficult to brute force)
    }

    function fulfillRandomWords(
        // see VRFConsumerBaseV2.sol
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {}

    /**
     * @notice
     * adds msg.sender to the players array
     */
    function enterLottery() external payable {
        if (msg.value != i_fee) {
            revert Lottery__NeedToSendCorrectAmount();
        }
        s_players.push(payable(msg.sender));
        emit Lottery_Enter(msg.sender);
    }

    /* View/Pure functions */
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
    function getPlayers() public view returns (address payable[] memory) {
        return s_players;
    }
}
