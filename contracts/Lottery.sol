// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

error Lottery__UnAuthorized();
error Lottery__NeedToSendCorrectAmount();
error Lottery__TransferFailed();

// import "hardhat/console.sol";

// Chainlink VRF
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

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
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator; // https://docs.chain.link/docs/vrf/v2/subscription/examples/get-a-random-number/
    bytes32 private immutable i_gasLane; // gasLane -- exple : goerli "30 gwei Key Hash" https://docs.chain.link/docs/vrf/v2/subscription/supported-networks/#configurations
    uint64 private immutable i_subscriptionId; // -- exple : goerli https://vrf.chain.link/goerli
    uint32 private immutable i_callbackGasLimit; //
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUMWORDS = 1;

    /* Lottery Variables */
    address payable private s_newWinner;

    /* Events */
    event LotteryEntered(address indexed _player);
    event RandomWinnerRequested(uint256 indexed _requestId);
    event WinnerPicked(address indexed s_newWinner);

    modifier onlyOwner() {
        if (i_owner != msg.sender) {
            revert Lottery__UnAuthorized();
        }
        _;
    }

    constructor(
        uint256 _fee,
        address _vrfCoordinator,
        bytes32 _gasLane,
        uint64 _subscriptionId,
        uint32 _callbackGasLimit
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        i_owner = msg.sender;
        i_fee = _fee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        i_gasLane = _gasLane;
        i_subscriptionId = _subscriptionId;
        i_callbackGasLimit = _callbackGasLimit;
    }

    /**
     * @notice
     * will be called by the ChainLink Keeper automatically
     */
    function requestRandomWinner() external {
        // call on i_vrfCoordinator contract to request the random number
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUMWORDS
        );
        emit RandomWinnerRequested(requestId);
    }

    function fulfillRandomWords(
        // override VRFConsumerBaseV2.sol
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length; // randomWords[0] : we expect only 1 word (NUMWORDS = 1;) and we want a random number that belongs to [0, players.length]
        address payable newWinner = s_players[indexOfWinner];
        s_newWinner = newWinner;
        (bool success, ) = s_newWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Lottery__TransferFailed();
        }
        emit WinnerPicked(s_newWinner);
    }

    /**
     * @notice
     * adds msg.sender to the players array
     */
    function enterLottery() external payable {
        if (msg.value != i_fee) {
            revert Lottery__NeedToSendCorrectAmount();
        }
        s_players.push(payable(msg.sender));
        emit LotteryEntered(msg.sender);
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

    /**
     * @notice Getter for front end
     * returns the players array
     */
    function getNewWinner() public view returns (address) {
        return s_newWinner;
    }
}
