// artifacts
const Test = artifacts.require("./Test.sol");
const MilestoneCrowdsale = artifacts.require("./MilestoneCrowdsale.sol");
const TokenTimelock = artifacts.require("./TokenTimelock.sol");

// timestamp
const now = web3.eth.getBlock("latest").timestamp;

// total supply
const totalSupply = web3.toWei(1000000000, "ether");

// -> crowdsale info
const crowdsaleSupply = web3.toWei(720000000, "ether");
const crowdsaleSeconds = 864000; // 10 days

// -> timelock info
const totalTimelockSupply = web3.toWei(80000000, "ether");
const timelockSeconds = 31540000000; // 1 year
const timelockEndTime = now + timelockSeconds;

// -> bounty info
const bountySupply = web3.toWei(10000000, "ether");

// -> vesting info
const totalVestSupply = web3.toWei(190000000, "ether");
const vestingStart = now;
const vestingCliff = vestingStart + 5.256e6; // 2 months
const vestingTime = vestingStart + 6.307e7; // 2 years

module.exports = async (deployer, network, accounts) => {
  const addrs = {
    owner: accounts[0],
    bounty: accounts[5],
    founder: accounts[6]
  };
  const ops = {
    from: addrs.owner
  };

  // --> token
  await deployer.deploy(Test, totalSupply);
  const TestContract = await Test.at(Test.address);

  // --> crowdsale
  await deployer.deploy(
    MilestoneCrowdsale,
    crowdsaleSeconds,
    addrs.owner,
    Test.address
  );
  const CrowdsaleContract = await MilestoneCrowdsale.at(
    MilestoneCrowdsale.address
  );
  await CrowdsaleContract.addMilestone(
    web3.toWei(100000000, "ether"),
    web3.toWei(0.00014, "ether")
  );
  await CrowdsaleContract.addMilestone(
    web3.toWei(300000000, "ether"),
    web3.toWei(0.00017, "ether")
  );
  await CrowdsaleContract.addMilestone(
    web3.toWei(400000000, "ether"),
    web3.toWei(0.00019, "ether")
  );
  await CrowdsaleContract.addMilestone(
    web3.toWei(600000000, "ether"),
    web3.toWei(0.00021, "ether")
  );
  await CrowdsaleContract.addMilestone(
    web3.toWei(720000000, "ether"),
    web3.toWei(0.00023, "ether")
  );
  await CrowdsaleContract.start();

  // --> timelock
  await deployer.deploy(
    TokenTimelock,
    Test.address,
    addrs.owner,
    timelockEndTime
  );
  await TestContract.transfer(TokenTimelock.address, totalTimelockSupply, ops);

  // --> bounty
  await TestContract.transfer(addrs.bounty, bountySupply, ops);

  // --> vesting
  // example founder or marketer
  await TestContract.grantVestedTokens(
    addrs.founder,
    totalVestSupply,
    vestingStart,
    vestingCliff,
    vestingTime,
    false,
    false,
    ops
  );
};
