// For running Staging tests on Goerli we need:
// 1. Get our SubId for ChainLink VRF
/// https://vrf.chain.link/
//// => GOERLI_LINK_SUBSCRIPTION_ID
// 2. Deploy our contract using the SubId
// -> yarn hardhat deploy --network goerli
// 3. Register the contract with ChainLink VRF & its SubId
// -> Set as VRF consumer the deployed contract address
// 4. Register the contract with ChainLink Keepers
/// https://automation.chain.link/
// 5. Run Staging Tests
// -> yarn hardhat test --network goerli
