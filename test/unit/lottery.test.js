const {
    networkConfig,
    developmentChains,
} = require("../../hardhat-helper.config")
const { deployments, getNamedAccounts, ethers, network } = require("hardhat")
const { expect } = require("chai")
const { solidity } = require("ethereum-waffle")
require("hardhat-gas-reporter")

// unit tests : to run only on local
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", async function () {
          let deployer, user01
          let lottery, VRFCoordinatorV2Mock, entreeFee, interval
          const chainId = network.config.chainId

          beforeEach(async function () {
              ;[deployer, user01] = await ethers.getSigners()
              await deployments.fixture(["all"])
              VRFCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock",
                  deployer
              )
              lottery = await ethers.getContract("Lottery", deployer)
              entreeFee = await lottery.getFee()
              interval = await lottery.getInterval()
          })

          describe("constructor", async function () {
              it("initializes the Lottery correctly", async function () {
                  const lotteryState = await lottery.getLotteryState()
                  expect(lotteryState).to.equal(0)
                  expect(entreeFee).to.equal(networkConfig[chainId].entranceFee)
                  expect(interval).to.equal(networkConfig[chainId].interval)
              })
          })

          describe("enterLottery", async function () {
              describe("happy path", async function () {
                  it("adds the correct player in the players array", async function () {
                      const playersNber_Initial = (await lottery.getPlayers())
                          .length
                      await lottery
                          .connect(user01)
                          .enterLottery({ value: entreeFee })
                      const players = await lottery.getPlayers()
                      const playersNber = players.length
                      expect(playersNber).to.equal(playersNber_Initial + 1)
                      expect(players[0]).to.equal(user01.address)
                  })

                  it("emits an event when a player enters lottery", async function () {
                      await expect(lottery.enterLottery({ value: entreeFee }))
                          .to.emit(lottery, "LotteryEntered")
                          .withArgs(deployer.address)
                  })
              })
              describe("unhappy path", async function () {
                  it("reverts if the lottery is in 'calculating' state", async function () {
                      await lottery.enterLottery({ value: entreeFee })
                      // Time travel
                      await network.provider.send("evm_increaseTime", [
                          interval.toNumber() + 1,
                      ])
                      await network.provider.send("evm_mine", [])
                      // We pretend to be a ChainLink Keeper
                      await lottery.performUpkeep([])
                      // assert

                      await expect(
                          lottery
                              .connect(user01)
                              .enterLottery({ value: entreeFee })
                      ).to.be.revertedWithCustomError(
                          lottery,
                          "Lottery__NotOpen"
                      )
                  })

                  it("reverts if the value sent is incorrect", async function () {
                      await expect(
                          lottery.enterLottery()
                      ).to.be.revertedWithCustomError(
                          lottery,
                          "Lottery__NeedToSendCorrectAmount"
                      )
                  })
              })
          })

          describe("checkupkeep", async function () {
              it("returns false if no user has sent ETH", async function () {
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ])
                  await network.provider.send("evm_mine", [])
                  // checkUpkeep is "public" without "view" so HH interprets a call to this func as a transaction.
                  /// here, we don t want create a transaction, we just want to get the value returned by checkUpkeep.
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(
                      []
                  )
                  expect(upkeepNeeded).to.equal(false)
              })
          })
      })
