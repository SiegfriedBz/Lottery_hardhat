const { networkConfig, developmentChains } = require("../hardhat-helper.config")
const { network, ethers } = require("hardhat")
const { verify } = require("../utils/verify")
require("dotenv").config()

module.exports = async (hre) => {
    const { deployments, getNamedAccounts } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    /* Constructor args */
    const entranceFee = networkConfig[chainId].entranceFee
    const link_GasLane = networkConfig[chainId].link_GasLane
    const link_CallBack_GasLimit = networkConfig[chainId].link_CallBack_GasLimit
    const interval = networkConfig[chainId].interval
    let link_VrfCoordinatorV2_Address
    let link_SubscriptionId
    let etherScanBaseUrl

    let VRFCoordinatorV2Mock

    if (developmentChains.includes(network.name)) {
        // on local, get VRFCoordinatorV2 Mock
        VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        link_VrfCoordinatorV2_Address = VRFCoordinatorV2Mock.address
        const transactionResponse =
            await VRFCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        // get link_SubscriptionId from event RandomWordsRequested emitted by VRFCoordinatorV2Mock
        link_SubscriptionId = transactionReceipt.events[0].args.subId
        // fund the subscription (done with LINK on real networks)
        await VRFCoordinatorV2Mock.fundSubscription(
            link_SubscriptionId,
            ethers.utils.parseEther("2")
        )
    } else {
        // on testnet
        link_VrfCoordinatorV2_Address =
            networkConfig[chainId].link_VrfCoordinatorV2_Address
        link_SubscriptionId = networkConfig[chainId].link_SubscriptionId // done from chainlink ui
        etherScanBaseUrl = networkConfig[chainId].etherScanBaseUrl
    }

    /* Constructor Args */
    let args = [
        entranceFee,
        link_VrfCoordinatorV2_Address,
        link_GasLane,
        link_SubscriptionId,
        link_CallBack_GasLimit,
        interval,
    ]

    const lottery = await deploy("Lottery", {
        contract: "Lottery",
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    console.log("Lottery deployed.")
    console.log("-------------------------")

    if (developmentChains.includes(network.name)) {
        // on local, add the lottery contract as a consumer of the VRFCoordinatorV2Mock
        await VRFCoordinatorV2Mock.addConsumer(
            link_SubscriptionId,
            lottery.address
        )
        console.log("Lottery added as a consumer of VRFCoordinatorV2Mock.")
        console.log("-------------------------")
    }

    if (
        // if deploy on testnet
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        console.log("Etherscan :", `${etherScanBaseUrl}/${contract.address}`)
        await verify(contract.address, args)
    }
    console.log("-------------------------")
}

module.exports.tags = ["all", "lottery"]
