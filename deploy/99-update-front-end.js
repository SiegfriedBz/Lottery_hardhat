const { network, ethers } = require("hardhat")
require("dotenv").config()
const fs = require("fs")

const FRONT_END_ADDRESSES_FILE =
    "../nextjs-lottery-fcc/constants/contractAddresses.json"
const FRONT_END_ABI_FILE = "../nextjs-lottery-fcc/constants/contractAbi.json"

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("updating front-end...")
        await updateContractAddresses()
        await updateAbi()
        console.log("Front-end updated.")
        console.log("-------------------------")
    }
}

async function updateAbi() {
    const lottery = await ethers.getContract("Lottery")
    fs.writeFileSync(
        FRONT_END_ABI_FILE,
        lottery.interface.format(ethers.utils.FormatTypes.json)
    )
}

async function updateContractAddresses() {
    const lottery = await ethers.getContract("Lottery")
    const chainId = network.config.chainId.toString()
    const currentAddresses = JSON.parse(
        fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8")
    )
    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(lottery.address)) {
            currentAddresses[chainId].push(lottery.address)
        }
    } else {
        currentAddresses[chainId] = [lottery.address]
    }
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses))
}

module.exports.tags = ["all", "front-end"]
