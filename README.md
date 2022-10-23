# Lottery Project
```
This contract is for creating an untamperable decentralized Lottery smart contract
```
```
This implements Chainlink VRF v2 and Chainlink Keeper ("Automation")

```
Set up

```
1.
git clone git@github.com:SiegfriedBz/Lottery_hardhat.git

2. 
create .env file and fill values, using .env.example keys

PRIV_KEY= // your wallet private key
GOERLI_RPC_URL= // https://www.alchemy.com/
MUMBAI_RPC_URL=
GOERLI_LINK_SUBSCRIPTION_ID= //https://vrf.chain.link/goerli
MUMBAI_LINK_SUBSCRIPTION_ID=
GOERLI_ETHERSCAN_API_KEY= // https://etherscan.io/apis
MUMBAI_ETHERSCAN_API_KEY=
COIN_MARKET_CAP_API_KEY= // https://coinmarketcap.com/api/
UPDATE_FRONT_END=true

3.
yarn install
```

Try running some of the following tasks:

```shell
yarn hardhat help
yarn hardhat compile
yarn hardhat test
REPORT_GAS=true yarn hardhat test
yarn hardhat coverage
yarn hardhat node
yarn hardhat deploy
yarn hardhat deploy --network goerli 
yarn hardhat deploy --network polygonMumbai
```
