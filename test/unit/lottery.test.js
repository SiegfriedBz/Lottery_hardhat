const {
    networkConfig,
    developmentChains,
} = require("../../hardhat-helper.config")
const { deployments, getNamedAccounts, ethers, network } = require("hardhat")
const { expect } = require("chai")
const { solidity } = require("ethereum-waffle")
require("hardhat-gas-reporter")

// unit tests : to only run on local
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", async function () {
          let deployer, user01
          let lottery, VRFCoordinatorV2Mock
          const chainId = network.config.chainId

          beforeEach(async function () {
              ;[deployer, user01] = await ethers.getSigners()
              await deployments.fixture(["all"])
              VRFCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock",
                  deployer
              )
              lottery = await ethers.getContract("Lottery", deployer)
          })

          describe("constructor", async function () {
              it("initializes the Lottery correctly", async function () {
                  const lotteryState = await lottery.getLotteryState()
                  expect(lotteryState).to.equal(0)
                  const entreeFee = await lottery.getFee()
                  expect(entreeFee).to.equal(networkConfig[chainId].entranceFee)
                  const interval = await lottery.getInterval()
                  expect(interval).to.equal(networkConfig[chainId].interval)
              })
          })

          describe("enterLottery", async function () {
              describe("happy path", async function () {})
              describe("un-happy path", async function () {
                  it("reverts if the value sent is incorrect", async function () {
                      let entreeFee = await lottery.getFee()
                      await expect(
                          lottery.enterLottery({ value: entreeFee.div(2) })
                      ).to.be.revertedWithCustomError(
                          lottery,
                          "Lottery__NeedToSendCorrectAmount"
                      )
                  })
              })
          })
      })
