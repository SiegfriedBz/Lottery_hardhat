const { ethers } = require("hardhat")
require("dotenv").config()

const networkConfig = {
    31337: {
        name: "hardhat",
        entranceFee: ethers.utils.parseEther("0.001"),
        // link_VrfCoordinatorV2_Address from Mock
        link_GasLane:
            "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15", // same as goerli
        // link_SubscriptionId : done programmatically, see 01-deploy-lottery.js
        link_baseFee: ethers.utils.parseEther("0.25"), // same as goerli
        link_gasPriceLink: 10e9, // same as goerli
        link_CallBack_GasLimit: 500000, // same as goerli
        interval: "300", // same as goerli
    },
    5: {
        name: "goerli",
        entranceFee: ethers.utils.parseEther("0.001"),
        link_VrfCoordinatorV2_Address:
            "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        link_GasLane:
            "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15", // bytes32 _gasLane KeyHash
        link_SubscriptionId: process.env.GOERLI_LINK_SUBSCRIPTION_ID, // uint64 _subscriptionId,
        link_baseFee: ethers.utils.parseEther("0.25"), //it costs 0.25LINK per rdom number request// uint96 _baseFee : "Premium" value, network-specific at https://docs.chain.link/docs/vrf/v2/subscription/supported-networks/#goerli-testnet
        link_gasPriceLink: 10e9, // ~ LINK per GAS
        link_CallBack_GasLimit: 500000, // uint32 _callbackGasLimit
        interval: "300", //
        etherScanBaseUrl: "https://goerli.etherscan.io/address",
    },
    80001: {
        name: "polygonMumbai",
        entranceFee: ethers.utils.parseEther("0.0001"),
        link_VrfCoordinatorV2_Address:
            "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed",
        link_GasLane:
            "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f",
        link_SubscriptionId: process.env.MUMBAI_LINK_SUBSCRIPTION_ID,
        link_baseFee: ethers.utils.parseEther("0.0005"),
        link_gasPriceLink: 10e9, // /!\TO CHANGE
        link_CallBack_GasLimit: 500000,
        interval: "300",
        etherScanBaseUrl: "https://mumbai.polygonscan.com/address",
    },
}

developmentChains = ["hardhat", "localhost"]

module.exports = {
    networkConfig,
    developmentChains,
}
