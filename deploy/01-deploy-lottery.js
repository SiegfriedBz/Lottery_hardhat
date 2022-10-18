const {
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
} = require("../hardhat-helper.config")
const { network } = require("hardhat")
const { verify } = require("../utils/verify")
require("dotenv").config()

module.exports = async (hre) => {
    const { deployments, getNamedAccounts } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    const [
        VRF_COORDINATOR_ADDRESS,
        GASLANE,
        LINK_SUBSCRIPTION_ID,
        ETHERSCAN_BASE_URL,
    ] =
        chainId == 5
            ? [
                  GOERLI_VRF_COORDINATOR_ADDRESS,
                  GOERLI_GASLANE,
                  GOERLI_LINK_SUBSCRIPTION_ID,
                  "https://goerli.etherscan.io/address",
              ]
            : chainId == 80001
            ? [
                  MUMBAI_VRF_COORDINATOR_ADDRESS,
                  MUMBAI_GASLANE,
                  MUMBAI_LINK_SUBSCRIPTION_ID,
                  "https://mumbai.polygonscan.com/address",
              ]
            : ["", "", "", ""]

    const contract = await deploy("Lottery", {
        contract: "Lottery",
        from: deployer,
        args: [
            FEE,
            VRF_COORDINATOR_ADDRESS,
            GASLANE,
            LINK_SUBSCRIPTION_ID,
            CALLBACK_GAS_LIMIT,
            INTERVAL,
        ],
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        // if deploy not on local
        console.log("Etherscan :", `${ETHERSCAN_BASE_URL}/${contract.address}`)
        await verify(contract.address, [
            FEE,
            VRF_COORDINATOR_ADDRESS,
            GASLANE,
            LINK_SUBSCRIPTION_ID,
            CALLBACK_GAS_LIMIT,
            INTERVAL,
        ])
    }
}

module.exports.tags = ["all", "lottery"]
