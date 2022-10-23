const {
  networkConfig,
  developmentChains,
} = require("../../hardhat-helper.config")
const { ethers, getNamedAccounts, network } = require("hardhat")
const { expect } = require("chai")
const { solidity } = require("ethereum-waffle")
require("hardhat-gas-reporter")

// staging tests : only on test net
developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery", function () {
      let lottery, deployer, entranceFee, interval
      console.log("Starting Staging Tests...")

      beforeEach(async function () {
        ;[deployer] = await ethers.getSigners()
        lottery = await ethers.getContract("Lottery", deployer)

        entranceFee = await lottery.getFee()
        interval = await lottery.getInterval()
        console.log(
          `Found deployed Lottery contract on Testnet at : ${lottery.address}`
        )
      })

      describe("fulfillRandomWords", function () {
        it("works with live Chainlink Keepers and Chainlink VRF, we get a winner", async function () {
          await new Promise(async (resolve, reject) => {
            console.log("Setting up WinnerPicked event listener")
            //// setup listener BEFORE we enter the lottery
            lottery.once("WinnerPicked", async () => {
              console.log("WinnerPicked event was emitted ")
              try {
                // picks up a winner
                let winner = await lottery.getNewWinner()
                console.log(`Winner is ${winner}`)
                expect(winner).to.equal(deployer.address)
                // sets correctly the winner prize amount
                let prize = await lottery.getNewWinnerPrize()
                expect(prize).to.equal(entranceFee)
                //sends the correct amount to the winner
                let player_Balance = await ethers.provider.getBalance(
                  deployer.address
                )
                expect(player_Balance).to.equal(player_Balance_Init.add(prize))
                // resets correctly the contract balance"
                let contractBalance = await ethers.provider.getBalance(
                  lottery.address
                )
                expect(contractBalance.toString()).to.equal("0")
                // allows to pick up a winner after the player entered the lottery
                let endingTimeStamp = await lottery.getLatestTimeStamp()
                console.log(new Date(endingTimeStamp * 1000).toLocaleString())
                expect(endingTimeStamp).to.be > startingTimeStamp
                // resets correctly the lottery state to OPEN
                let lotteryState = await lottery.getLotteryState()
                expect(lotteryState.toString()).to.equal("0")
                // resets correctly the array of players
                let newPlayers = await lottery.getPlayers()
                expect(newPlayers.length.toString()).to.equal("0")
              } catch (error) {
                reject(error)
              }
              resolve()
              console.log("Staging Tests ran successfully")
              console.log("-------------------------")
            })
            //// enter LotteryLottery
            let player_Balance_Init
            let startingTimeStamp = await lottery.getLatestTimeStamp()
            console.log(`Player entering Lottery...`)
            let trx = await lottery.enterLottery({
              value: entranceFee,
              gasLimit: 10000000,
            })
            await trx.wait(1)
            console.log("Player entered.")
            player_Balance_Init = await ethers.provider.getBalance(
              deployer.address
            )
          })
        })
      })
    })
