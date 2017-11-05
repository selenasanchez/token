const expectThrow = require("./helpers/expectThrow");
const { advanceToBlock } = require("./helpers/advanceBlock");
const Test = artifacts.require("Test");
const MilestoneCrowdsale = artifacts.require("MilestoneCrowdsale");

contract("MilestoneCrowdsale", function(accounts) {
  const totalSupply = web3.toWei(100, "ether");
  const crowdsaleSupply = web3.toWei(100, "ether");
  const milestone1 = web3.toWei(20, "ether");
  const pricePerToken1 = web3.toWei(0.1, "ether");
  const milestone2 = web3.toWei(40, "ether");
  const pricePerToken2 = web3.toWei(0.5, "ether");
  const milestone3 = web3.toWei(60, "ether");
  const pricePerToken3 = web3.toWei(1, "ether");
  const milestone4 = web3.toWei(100, "ether");
  const pricePerToken4 = web3.toWei(2, "ether");

  const endSeconds = 30;

  const [owner, buyer1, buyer2] = accounts;
  let t;
  let c;

  beforeEach(async function() {
    t = await Test.new(totalSupply);
    c = await MilestoneCrowdsale.new(endSeconds, owner, t.address);
  });

  // initial state
  it("stage: Preparing", async function() {
    const stage = await c.isStage(0);
    assert.equal(stage, true);
  });

  it("hasEnded: should be false", async function() {
    const hasEnded = await c.hasEnded();
    assert.equal(hasEnded, false);
  });

  it("hasEnded: too late", async function() {
    await t.transfer(c.address, crowdsaleSupply);
    c = await MilestoneCrowdsale.new(0, owner, t.address);
    await c.addMilestone(milestone1, pricePerToken1);
    await c.start();

    await advanceToBlock(web3.eth.blockNumber + 20);

    const hasEnded = await c.hasEnded();
    assert.equal(hasEnded, true);
  });

  it("getMilestonesLength: should be 0", async function() {
    const length = await c.getMilestonesLength.call();
    assert.equal(length, 0);
  });

  it("getCurrentMilestoneIndex: should be false and 0", async function() {
    const [found, index] = await c.getCurrentMilestoneIndex.call();
    assert.equal(found, false);
    assert.equal(index, 0);
  });

  // milestones
  it("addMilestone: invalid pricePerToken", async function() {
    await expectThrow(c.addMilestone(0, pricePerToken1));
  });

  it("addMilestone: invalid milestone", async function() {
    await expectThrow(c.addMilestone(milestone1, 0));
  });

  it("stage: Started", async function() {
    await c.addMilestone(milestone1, pricePerToken1);
    await c.start();

    const stage = await c.isStage(1);
    assert.equal(stage, true);
  });

  it("addMilestone: when started", async function() {
    await c.addMilestone(milestone1, pricePerToken1);
    await c.start();
    await expectThrow(c.addMilestone(milestone2, pricePerToken2));
  });

  it("addMilestone: valid", async function() {
    await c.addMilestone(milestone1, pricePerToken1);

    const length = await c.getMilestonesLength.call();
    assert.equal(length, 1);

    const [found, index] = await c.getCurrentMilestoneIndex.call();
    assert.equal(found, true);
    assert.equal(index, 0);

    const [weiTokenAmount, pricePerToken] = await c.milestones.call(index);
    assert.equal(weiTokenAmount.toNumber(), milestone1);
    assert.equal(pricePerToken.toNumber(), pricePerToken1);
  });

  it("addMilestone: add 2 milestones, last invalid", async function() {
    await c.addMilestone(milestone1, pricePerToken1);
    await expectThrow(c.addMilestone(milestone1, pricePerToken1));
  });

  it("addMilestone: add 2", async function() {
    await c.addMilestone(milestone1, pricePerToken1);
    await c.addMilestone(milestone2, pricePerToken2);

    const length = await c.getMilestonesLength.call();
    assert.equal(length, 2);

    const [found, index] = await c.getCurrentMilestoneIndex.call();
    assert.equal(found, true);
    assert.equal(index.toNumber(), 0);
  });

  it("addMilestone: add 2 and then remove", async function() {
    await c.addMilestone(milestone1, pricePerToken1);
    await c.addMilestone(milestone2, pricePerToken2);

    await c.removeMilestone();

    const length = await c.getMilestonesLength.call();
    assert.equal(length, 1);

    const [found, index] = await c.getCurrentMilestoneIndex.call();
    assert.equal(found, true);
    assert.equal(index.toNumber(), 0);
  });

  it("stage: Finished", async function() {
    await t.transfer(c.address, crowdsaleSupply);
    c = await MilestoneCrowdsale.new(0, owner, t.address);
    await c.addMilestone(milestone1, pricePerToken1);
    await c.start();

    await advanceToBlock(web3.eth.blockNumber + 20);

    const stage = await c.isStage(2);
    assert.equal(stage, true);
  });

  it("buyTokens: too late", async function() {
    await t.transfer(c.address, crowdsaleSupply);
    c = await MilestoneCrowdsale.new(0, owner, t.address);
    await c.addMilestone(milestone1, pricePerToken1);
    await c.start();

    await expectThrow(
      c.buyTokens(buyer1, {
        from: buyer1,
        value: web3.toWei(2, "ether")
      })
    );
  });

  it("buyTokens: reached milestone", async function() {
    await t.transfer(c.address, crowdsaleSupply);
    await c.addMilestone(milestone1, pricePerToken1);
    await c.start();

    await c.buyTokens(buyer1, {
      from: buyer1,
      value: web3.toWei(2, "ether")
    });

    await expectThrow(
      c.buyTokens(buyer1, {
        from: buyer1,
        value: web3.toWei(0.1, "ether")
      })
    );
  });

  it("buyTokens", async function() {
    await t.transfer(c.address, crowdsaleSupply);
    await c.addMilestone(milestone1, pricePerToken1);
    await c.addMilestone(milestone2, pricePerToken2);
    await c.start();

    await c.buyTokens(buyer1, {
      from: buyer1,
      value: web3.toWei(2, "ether")
    });
    assert.equal(
      (await t.balanceOf(buyer1)).toNumber(),
      web3.toWei(20, "ether")
    );

    await c.sendTransaction({
      from: buyer1,
      value: web3.toWei(10, "ether")
    });
    assert.equal(
      (await t.balanceOf(buyer1)).toNumber(),
      web3.toWei(40, "ether")
    );
  });

  it("burnTokens: when hasEnded = false", async function() {
    await t.transfer(c.address, crowdsaleSupply);
    await expectThrow(c.burnTokens());
  });

  it("burnTokens: buy above milestone", async function() {
    await t.transfer(c.address, crowdsaleSupply);
    await c.addMilestone(milestone1, pricePerToken1);
    await c.start();

    await c.buyTokens(buyer1, {
      from: buyer1,
      value: web3.toWei(2, "ether")
    });

    await expectThrow(
      c.buyTokens(buyer1, {
        from: buyer1,
        value: web3.toWei(1, "ether")
      })
    );
  });

  it("burnTokens", async function() {
    c = await MilestoneCrowdsale.new(0, owner, t.address);
    await t.transfer(c.address, crowdsaleSupply);
    await c.addMilestone(milestone1, pricePerToken1);
    await c.start();

    await advanceToBlock(web3.eth.blockNumber + 20);

    const hasEnded = await c.hasEnded();
    assert.equal(hasEnded, true);

    await c.burnTokens();

    const balance = await t.balanceOf(c.address).then(v => v.toNumber());
    assert.equal(balance, 0);
  });
});
