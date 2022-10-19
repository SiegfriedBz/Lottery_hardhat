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
    : describe("Lottery", function () {
          let deployer, user01
          let lottery
          let VRFCoordinatorV2Mock
          let entranceFee, interval
          const chainId = network.config.chainId

          beforeEach(async function () {
              ;[deployer, user01] = await ethers.getSigners()
              await deployments.fixture(["all"])
              VRFCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock",
                  deployer
              )
              lottery = await ethers.getContract("Lottery", deployer)
              entranceFee = await lottery.getFee()
              interval = await lottery.getInterval()
          })

          describe("constructor", function () {
              it("initializes the Lottery correctly", async function () {
                  const lotteryState = await lottery.getLotteryState()
                  expect(lotteryState).to.equal(0)
                  expect(entranceFee).to.equal(
                      networkConfig[chainId].entranceFee
                  )
                  expect(interval).to.equal(networkConfig[chainId].interval)
              })
          })

          describe("enterLottery", function () {
              describe("happy path", function () {
                  it("adds the correct player in the players array", async function () {
                      const playersNber_Initial = (await lottery.getPlayers())
                          .length
                      await lottery
                          .connect(user01)
                          .enterLottery({ value: entranceFee })
                      const players = await lottery.getPlayers()
                      const playersNber = players.length
                      expect(playersNber).to.equal(playersNber_Initial + 1)
                      expect(players[0]).to.equal(user01.address)
                  })

                  it("emits an event when a player enters lottery", async function () {
                      await expect(lottery.enterLottery({ value: entranceFee }))
                          .to.emit(lottery, "LotteryEntered")
                          .withArgs(deployer.address)
                  })
              })

              describe("unhappy path", function () {
                  it("reverts if the lottery is not opened", async function () {
                      await lottery.enterLottery({ value: entranceFee })
                      // Time Travel + Mine
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
                              .enterLottery({ value: entranceFee })
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

          describe("checkUpkeep", function () {
              it("returns false if no user has sent ETH", async function () {
                  // Time Travel + Mine
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ])
                  await network.provider.send("evm_mine", [])
                  // checkUpkeep is "public" without "view" so HH interprets a call to this func as a transaction.
                  /// here, we don t want create a transaction, we just want to get the value returned by checkUpkeep.
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(
                      []
                  )
                  // assert
                  expect(!upkeepNeeded)
              })

              it("returns false if lottery is not opened", async function () {
                  await lottery.enterLottery({ value: entranceFee })
                  // Time Travel + Mine
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ])
                  await network.provider.send("evm_mine", [])
                  // performUpkeep to update lottery state
                  await lottery.performUpkeep([])
                  let lotteryState = await lottery.getLotteryState()
                  // checkUpkeep callStatic
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(
                      []
                  )
                  // assert
                  expect(lotteryState).to.equal(1) // not open
                  expect(!upkeepNeeded)
              })

              it("returns false if enough time hasn't passed", async () => {
                  await lottery.enterLottery({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() - 50,
                  ]) // use a higher number here if this test fails
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(
                      "0x"
                  ) // upkeepNeeded = (isOpen && timePassed && hasPlayer && isFunded)
                  expect(!upkeepNeeded)
              })

              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await lottery.enterLottery({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(
                      "0x"
                  ) // upkeepNeeded = (isOpen && timePassed && hasPlayer && isFunded)
                  expect(upkeepNeeded)
              })
          })

          describe("performUpkeep", function () {
              describe("happy path", function () {
                  it("can only be run if upkeepNeeded is true", async function () {
                      await lottery.enterLottery({ value: entranceFee })
                      await network.provider.send("evm_increaseTime", [
                          interval.toNumber() + 1,
                      ])
                      await network.provider.send("evm_mine", [])
                      let { upkeepNeeded } =
                          await lottery.callStatic.checkUpkeep([])
                      expect(upkeepNeeded)
                      let trx = await lottery.performUpkeep([])
                      expect(trx)
                  })
              })
              describe("unhappy path", function () {
                  it("reverts if upkeepNeeded is false", async function () {
                      let { upkeepNeeded } =
                          await lottery.callStatic.checkUpkeep([])
                      expect(!upkeepNeeded)
                      await expect(
                          lottery.performUpkeep([])
                      ).to.be.revertedWithCustomError(
                          lottery,
                          "Lottery__UpKeepNotNeeded"
                      )
                  })
              })
          })
      })
