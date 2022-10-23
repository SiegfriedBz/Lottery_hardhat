// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

error Lottery__UnAuthorized();
error Lottery__NeedToSendCorrectAmount();
error Lottery__TransferFailed();
error Lottery__NotOpen();
error Lottery__UpKeepNotNeeded(
    uint256 _lotteryBalance,
    uint256 _numberOfPlayers,
    uint256 _lotteryState
);

// import "hardhat/console.sol";

// Chainlink VRF v2
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
// Chainlink Keeper
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

/** @title A sample Lottery contract
 * @author SiegfriedBz
 * @notice This contract is for creating an untamperable decentralized Lottery smart contract
 * @dev This implements Chainlink VRF v2 and Chainlink Keeper ("Automation")
 * @notice User can enter Lottery by sending ETH
 * @notice Chainlink VRF will pick a random number
 * @notice Chainlink Keeper will call the function to pick a winner
 */

contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /* Type Declaration */
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    /* State Variables */
    address private immutable i_owner;
    uint256 private immutable i_fee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator; // VRF -- https://docs.chain.link/docs/vrf/v2/subscription/examples/get-a-random-number/
    bytes32 private immutable i_gasLane; // VRF -- gasLane -- eg: goerli "30 gwei Key Hash" https://docs.chain.link/docs/vrf/v2/subscription/supported-networks/#configurations
    uint64 private immutable i_subscriptionId; // VRF -- -- eg: goerli https://vrf.chain.link/goerli
    uint32 private immutable i_callbackGasLimit; // VRF
    uint16 private constant REQUEST_CONFIRMATIONS = 3; // VRF
    uint32 private constant NUMWORDS = 1; // VRF

    /* Lottery Variables */
    address payable private s_newWinner;
    LotteryState private s_lotteryState;
    uint256 private immutable i_interval; // KEEPER
    uint256 private immutable i_endDate;
    uint256 private s_lastTimeStamp;
    uint256 private s_newPrize;

    /* Events */
    event LotteryEntered(address indexed player);
    event RandomWinnerRequested(uint256 indexed requestId);
    event WinnerPicked(
        address indexed s_newWinner,
        uint256 indexed s_newPrize,
        uint256 indexed winDate
    );

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
        uint32 _callbackGasLimit,
        uint256 _interval
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        i_owner = msg.sender;
        i_fee = _fee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        i_gasLane = _gasLane;
        i_subscriptionId = _subscriptionId;
        i_callbackGasLimit = _callbackGasLimit;
        s_lotteryState = LotteryState.OPEN;
        i_interval = _interval;
        i_endDate = block.timestamp + _interval;
        s_lastTimeStamp = block.timestamp;
    }

    /**
     * @dev function called by the ChainLink Keeper ("Automation") nodes
     * They look for "upkeepNeeded" to return true
     * To return true the following is needed
     * 1. Lottery is in "open" state ("closed" when waiting for a random number from Chainlink VRF)
     * 2. Time interval has passed
     * 3. Lottery has >= 1player, and Lottery is funded
     * 4. ChainLink subscription has enough LINK
     */
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool isOpen = (s_lotteryState == LotteryState.OPEN);
        bool timePassed = (block.timestamp - s_lastTimeStamp) > i_interval;
        bool hasPlayer = (s_players.length > 0);
        bool isFunded = (address(this).balance > 0);
        upkeepNeeded = (isOpen && timePassed && hasPlayer && isFunded);
    }

    /**
     * @dev function called by the ChainLink Keeper ("Automation") nodes
     * when checkUpkeep() return true
     */
    function performUpkeep(
        bytes memory /* performData */
    ) external override {
        //upkeep revalidation
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Lottery__UpKeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_lotteryState)
            );
        }
        // update lastTimeStamp
        s_lastTimeStamp = block.timestamp;
        // update LotteryState
        s_lotteryState = LotteryState.CALCULATING;
        // request the random number on i_vrfCoordinator contract
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUMWORDS
        );
        emit RandomWinnerRequested(requestId);
    }

    /**
     * @dev function called by the ChainLink nodes
     * After the request for randomness is made, a Chainlink Node calls its own fulfillRandomWords to run off-chain calculation => randomWords.
     * Then, a Chainlink Node calls our fulfillRandomWords (on-chain) and pass to it the requestId and the randomWords.
     */
    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length; // randomWords[0] : we expect only 1 "random word" (having passed NUMWORDS = 1;) and we want a "random word" belonging to [0, players.length]
        address payable newWinner = s_players[indexOfWinner];
        s_newWinner = newWinner;
        s_players = new address payable[](0);
        s_lotteryState = LotteryState.OPEN;
        s_newPrize = address(this).balance;
        (bool success, ) = s_newWinner.call{value: s_newPrize}("");
        if (!success) {
            revert Lottery__TransferFailed();
        }
        emit WinnerPicked(s_newWinner, s_newPrize, block.timestamp);
    }

    /**
     * @notice
     * adds msg.sender to the players array
     */
    function enterLottery() external payable {
        if (s_lotteryState != LotteryState.OPEN) {
            revert Lottery__NotOpen();
        }
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
     */
    function getNewWinner() public view returns (address) {
        return s_newWinner;
    }

    /**
     * @notice Getter for front end
     */
    function getNewWinnerPrize() public view returns (uint256) {
        return s_newPrize;
    }

    /**
     * @notice Getter for front end
     */
    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    /**
     * @notice Getter for front end
     */
    function getLotteryState() public view returns (uint256) {
        return uint256(s_lotteryState);
    }

    /**
    /**
     * @notice Getter for front end
     */
    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    /**
     * @notice Getter for front end
     */
    function getEndDate() public view returns (uint256) {
        return i_endDate;
    }

    /**
     * @notice Getter for front end
     */
    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    /**
     * @notice Getter for front end
     */
    function getNumWords() public pure returns (uint256) {
        return NUMWORDS;
    }
}
