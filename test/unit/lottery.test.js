const {
    networkConfig,
    developmentChains,
} = require("../../hardhat-helper.config")
const { deployments, getNamedAccounts, ethers, network } = require("hardhat")
const { expect } = require("chai")
const { solidity } = require("ethereum-waffle")
require("hardhat-gas-reporter")

// unit tests : only on local
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", function () {
          let accounts, deployer, user01
          let lottery
          let VRFCoordinatorV2Mock
          let entranceFee, interval
          const chainId = network.config.chainId

          beforeEach(async function () {
              accounts = await ethers.getSigners()
              ;[deployer, user01] = accounts
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
                  expect(lotteryState.toString()).to.equal("0")
                  expect(entranceFee).to.equal(
                      networkConfig[chainId].entranceFee
                  )
                  expect(interval.toString()).to.equal(
                      networkConfig[chainId].interval.toString()
                  )
              })
          })

          describe("enterLottery", function () {
              describe("happy path", function () {
                  it("adds the correct player in the players array and adds the correct value to the contract", async function () {
                      const playersNber_Initial = (await lottery.getPlayers())
                          .length
                      await lottery
                          .connect(user01)
                          .enterLottery({ value: entranceFee })
                      const players = await lottery.getPlayers()
                      const playersNber = players.length
                      const lottery_Balance = await ethers.provider.getBalance(
                          lottery.address
                      )
                      expect(playersNber).to.equal(playersNber_Initial + 1)
                      expect(players[0]).to.equal(user01.address)
                      expect(lottery_Balance).to.equal(entranceFee)
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
                      // check Lottery state is OPEN
                      let lotteryState = await lottery.getLotteryState()
                      expect(lotteryState.toString()).to.equal("0")
                      // We pretend to be a ChainLink Keeper calling Lottery contract
                      await lottery.performUpkeep([])
                      // check Lottery state is CALCULATING
                      lotteryState = await lottery.getLotteryState()
                      expect(lotteryState.toString()).to.equal("1")
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
                  // performUpkeep to update lottery state to CALCULATING
                  await lottery.performUpkeep([])
                  let lotteryState = await lottery.getLotteryState()
                  expect(lotteryState.toString()).to.equal("1") // CALCULATING
                  // checkUpkeep callStatic
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(
                      []
                  )
                  // assert
                  expect(!upkeepNeeded)
              })

              it("returns false if enough time has not passed", async () => {
                  await lottery.enterLottery({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() - 25,
                  ])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(
                      []
                  ) // upkeepNeeded = (isOpen && timePassed && hasPlayer && isFunded)
                  expect(!upkeepNeeded)
              })

              it("returns TRUE if has players, eth, enough time has passed, and is open", async () => {
                  let players_Initial = await lottery.getPlayers()
                  let players_InitialNber = players_Initial.length
                  await lottery.enterLottery({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(
                      []
                  )
                  // checks
                  let players = await lottery.getPlayers()
                  let playersNber = players.length
                  expect(playersNber).to.equal(players_InitialNber + 1)
                  const lottery_Balance = await ethers.provider.getBalance(
                      lottery.address
                  )
                  expect(lottery_Balance).to.equal(entranceFee)
                  let lotteryState = await lottery.getLotteryState()
                  expect(lotteryState.toString()).to.equal("0") // OPEN
                  // upkeepNeeded = (isOpen && timePassed && hasPlayer && isFunded)
                  expect(upkeepNeeded)
              })
          })

          describe("performUpkeep", function () {
              describe("happy path", function () {
                  it("can only run if upkeepNeeded is TRUE", async function () {
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

                  it("updates the lottery state", async function () {
                      // player enters lottery
                      await lottery.enterLottery({ value: entranceFee })
                      // Time Travel and Mine
                      await network.provider.send("evm_increaseTime", [
                          interval.toNumber() + 1,
                      ])
                      await network.provider.send("evm_mine", [])
                      // check upkeepNeeded is true
                      let { upkeepNeeded } =
                          await lottery.callStatic.checkUpkeep([])
                      expect(upkeepNeeded)
                      // call performUpkeep
                      let transactionResponse = await lottery.performUpkeep([])
                      let transactionReceipt = await transactionResponse.wait(1)
                      // assert lottery's state is updated to CALCULATING
                      let lotteryState = await lottery.getLotteryState()
                      expect(lotteryState.toString()).to.equal("1")
                      // assert our event is emitted
                      expect(transactionResponse).to.emit(
                          lottery,
                          "RandomWinnerRequested"
                      )
                      // assert i_vrfCoordinator.requestRandomWords returns a requestId, that we passed to our event
                      /// note: we check events[1] bcz VRFCoordinator already emitted an event (RandomWordsRequested) (events[0]) by calling requestRandomWords(//)
                      let requestId =
                          transactionReceipt.events[1].args.requestId
                      expect(requestId.toNumber() > 0)
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

          describe("fulfillRandomWords", function () {
              beforeEach(async function () {
                  // player enters lottery, Time Travel and Mine
                  await lottery.enterLottery({ value: entranceFee })
                  await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ])
                  await network.provider.send("evm_mine", [])
              })

              it("reverts if performUpkeep was not called before", async function () {
                  // after request for randomness is made, ChainLink nodes run off-chain their own fulfillRandomWords, and if a request was actually made it ends up by the ChainLink nodes calling our fulfillRandomWords, on-chain
                  /// we pass a requestId and our contract address for ChainLink nodes to sent us back the random number if request successful.
                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(
                          0,
                          lottery.address
                      )
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(
                          1,
                          lottery.address
                      )
                  ).to.be.revertedWith("nonexistent request")
              })

              it("sets the winner, reset the lottery, and sends value to winner", async function () {
                  // add players and store initial Balances (after entering lottery, before winner pick up)
                  const deployer_Balance_Initial =
                      await ethers.provider.getBalance(deployer.address)
                  let players_Balances_Initial = []
                  players_Balances_Initial.push(deployer_Balance_Initial)
                  for (let i = 1; i < 4; i++) {
                      const player = accounts[i]
                      await lottery
                          .connect(player)
                          .enterLottery({ value: entranceFee })
                      let player_Balance_Initial =
                          await ethers.provider.getBalance(player.address)
                      players_Balances_Initial.push(player_Balance_Initial)
                  }
                  const players = await lottery.getPlayers()
                  expect(players.length).to.equal(4)

                  //
                  const StartingTimeStamp = await lottery.getLatestTimeStamp()
                  console.log(
                      new Date(StartingTimeStamp * 1000).toLocaleString()
                  )
                  // performUpkeep (mock being ChainLink Keepers)
                  // fulfillRandomWords (mock being ChainLink VRF)
                  // we will have to wait for the fulfillRandomWords to be called
                  await new Promise(async (resolve, reject) => {
                      // set up listener
                      lottery.once("WinnerPicked", async () => {
                          /// try catch block. note: mocha timeout set up in hh config
                          console.log("WinnerPicked event was emitted at ")
                          try {
                              const winner = await lottery.getNewWinner()
                              let indexOfWinner
                              for (let account of accounts) {
                                  if (account.address == winner) {
                                      indexOfWinner = accounts.indexOf(account)
                                  }
                              }
                              const winner_Balance =
                                  await ethers.provider.getBalance(winner)
                              const contractBalance =
                                  await ethers.provider.getBalance(
                                      lottery.address
                                  )
                              const prize = await lottery.getNewWinnerPrize()
                              const endingTimeStamp =
                                  await lottery.getLatestTimeStamp()
                              console.log(
                                  new Date(
                                      endingTimeStamp * 1000
                                  ).toLocaleString()
                              )
                              const lotteryState =
                                  await lottery.getLotteryState()
                              const newPlayers = await lottery.getPlayers()
                              expect(players).to.include(winner)
                              expect(winner_Balance).to.equal(
                                  players_Balances_Initial[indexOfWinner].add(
                                      prize
                                  )
                              )
                              expect(contractBalance.toString()).to.equal("0")
                              expect(prize).to.equal(
                                  entranceFee.mul(players.length)
                              )
                              expect(endingTimeStamp).to.be > StartingTimeStamp
                              expect(lotteryState.toString()).to.equal("0")
                              expect(newPlayers.length.toString()).to.equal("0")
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                          resolve()
                      })

                      // set up listener

                      // fire the event, listener will pick it up and resolve
                      /// performUpkeep (mock being ChainLink Keepers calling our performUpkeep). Note : players added, funds added, time
                      const tx = await lottery.performUpkeep([])
                      const txReceipt = await tx.wait(1)
                      /// fulfillRandomWords (mock being ChainLink VRF calling their fulfillRandomWords to which we pass the requestId got from the performUpkeep call + lottery contract address to send us back the random number
                      await VRFCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          lottery.address
                      )
                  })
              })
          })
      })
