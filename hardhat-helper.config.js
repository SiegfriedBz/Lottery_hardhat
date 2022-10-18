require("dotenv").config()

const networkConfig = {
    5: {
        name: "goerli",
    },
    80001: {
        name: "PolygonMumbai",
    },
}

developmentChains = ["hardhat", "localhost"]

/* Constructor Args */
// Lottery
const FEE = ethers.utils.parseEther("0.001") // uint256 _fee,
const INTERVAL = 1000 // uint256 _interval
// ChainLink VRF V2 for Ethereum Goerli / Polygon Mumbai testnets
const GOERLI_VRF_COORDINATOR_ADDRESS =
    "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D" // address _vrfCoordinator,
const GOERLI_GASLANE =
    "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15" // bytes32 _gasLane // KeyHash
const GOERLI_LINK_SUBSCRIPTION_ID = process.env.GOERLI_LINK_SUBSCRIPTION_ID // uint64 _subscriptionId,
const MUMBAI_VRF_COORDINATOR_ADDRESS =
    "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed"
const MUMBAI_GASLANE =
    "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f"
const MUMBAI_LINK_SUBSCRIPTION_ID = process.env.MUMBAI_LINK_SUBSCRIPTION_ID
const CALLBACK_GAS_LIMIT = 100000 // uint32 _callbackGasLimit,

module.exports = {
    networkConfig,
    developmentChains,
    FEE,
    INTERVAL,
    GOERLI_VRF_COORDINATOR_ADDRESS,
    GOERLI_GASLANE,
    GOERLI_LINK_SUBSCRIPTION_ID,
    MUMBAI_VRF_COORDINATOR_ADDRESS,
    MUMBAI_GASLANE,
    MUMBAI_LINK_SUBSCRIPTION_ID,
    CALLBACK_GAS_LIMIT,
}
