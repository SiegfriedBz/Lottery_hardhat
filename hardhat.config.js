require("@nomiclabs/hardhat-ethers")
require("ethereum-waffle")
require("@nomicfoundation/hardhat-chai-matchers")
require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || "http://goerli"
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL || "http://mumbai"
const PRIV_KEY = process.env.PRIV_KEY || "key"
const GOERLI_ETHERSCAN_API_KEY = process.env.GOERLI_ETHERSCAN_API_KEY || "key"
const MUMBAI_ETHERSCAN_API_KEY = process.env.MUMBAI_ETHERSCAN_API_KEY || "key"
const MARKET_CAP_API_KEY = process.env.COIN_MARKET_CAP_API_KEY || "key"

module.exports = {
    solidity: {
        compilers: [
            { version: "0.8.0" },
            { version: "0.8.17" },
            { version: "0.8.4" },
        ],
    },
    defaultNetwork: "hardhat",
    networks: {
        localhost: {
            chainId: 31337,
            url: "http://127.0.0.1:8545",
        },
        goerli: {
            chainId: 5,
            url: GOERLI_RPC_URL,
            accounts: [PRIV_KEY],
            blockConfirmations: 6,
        },
        polygonMumbai: {
            chainId: 80001,
            url: MUMBAI_RPC_URL,
            accounts: [PRIV_KEY],
            blockConfirmations: 6,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
            5: 0,
            80001: 0,
        },
        user01: {
            default: 1,
            5: 1,
            80001: 1,
        },
    },
    etherscan: {
        apiKey: {
            goerli: GOERLI_ETHERSCAN_API_KEY,
            polygonMumbai: MUMBAI_ETHERSCAN_API_KEY,
        },
        customChains: [
            {
                network: "goerli",
                chainId: 4,
                urls: {
                    apiURL: "https://api-rinkeby.etherscan.io/api",
                    browserURL: "https://rinkeby.etherscan.io",
                },
            },
            {
                network: "polygonMumbai",
                chainId: 80001,
                urls: {
                    apiURL: "https://api-testnet.polygonscan.com",
                    browserURL: "https://mumbai.polygonscan.com/",
                },
            },
        ],
    },
    gasReporter: {
        enabled: false,
        outputFile: "gasReport.txt",
        noColors: true,
        currency: "USD",
        coinmarketcap: MARKET_CAP_API_KEY,
    },
}
