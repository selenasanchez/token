pragma solidity 0.4.18;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Test.sol";


contract MilestoneCrowdsale is Ownable {
  using SafeMath for uint256;

  // The token being sold
  Test public token;

  // Stages
  enum Stages {
    Preparing,
    Started,
    Finished
  }
  Stages private stage = Stages.Preparing;

  // seconds before ending
  uint256 public endSeconds;
  // end time
  uint256 public endTime;

  // milestones
  struct Milestone {
    uint256 weiTokenAmount;
    uint256 pricePerToken;
  }
  Milestone[] public milestones;

  // address where funds are collected
  address public wallet;

  // amount of raised money in wei
  uint256 public weiRaised = 0;

  // amount of tokens raised
  uint256 public weiTokensRaised = 0;

  /**
   * event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);


  function MilestoneCrowdsale(uint256 _endSeconds, address _wallet, Test _token) {
    require(_endSeconds >= 0);
    require(_wallet != 0x0);
    require(address(_token) != 0x0);

    endSeconds = _endSeconds;
    wallet = _wallet;
    token = _token;
  }

  /**
  * @dev Check if input stage is the current stage, due to the fact that the crowdsale can reach max milestone,
  * or finish due to endTime, this always checks if it has finished, always use this to check the stage and not
  * stage variable.
  * @param _stage Expected stage.
  */
  function isStage(Stages _stage) constant public returns (bool) {
    bool ended = false;

    // check if is finished
    if (stage == Stages.Started) {
      bool hasMilestone = milestones.length > 0;
      bool belowMilestone = hasMilestone && weiTokensRaised < milestones[milestones.length - 1].weiTokenAmount;
      bool withinPeriod = now <= endTime;
      ended = !belowMilestone || !withinPeriod;
    }

    if (ended) {
      stage = Stages.Finished;
    }

    return _stage == stage;
  }

  modifier atStage(Stages _stage) {
    require(isStage(_stage));
    _;
  }

  /**
  * @dev Push new milestone to milestones.
  * @param weiTokenAmount The amount of the new milestone in wei.
  * @param pricePerToken Price per token in wei but times 18 to increase precision.
  */
  function addMilestone (uint256 weiTokenAmount, uint256 pricePerToken) external onlyOwner atStage(Stages.Preparing) {
    require(weiTokenAmount > 0);
    require(pricePerToken > 0);

    // new milestone amount must be larger than the previous milestone
    if (milestones.length > 0) {
      require(milestones[milestones.length - 1].weiTokenAmount < weiTokenAmount);
    }

    milestones.push(Milestone(weiTokenAmount, pricePerToken));
  }

  /**
  * @dev Remove last milestone.
  */
  function removeMilestone () external onlyOwner atStage(Stages.Preparing) {
    require(milestones.length > 0);

    delete milestones[milestones.length - 1];
    milestones.length--;
  }

  /**
  * @dev Get the amount of milestones.
  * @return An uint256 representing the amount of milestones.
  */
  function getMilestonesLength () constant public returns (uint256) {
    return milestones.length;
  }

  /**
  * @dev Get active milestone index.
  * @return bool A bool represeting if milestone was found.
  * @return uint256 An uint256 representing the index within the milestones array.
  */
  function getCurrentMilestoneIndex () constant public returns (bool, uint256) {
    if (milestones.length <= 0) {
      return (false, 0);
    }

    for (uint256 i = 0; i < milestones.length; i++) {
      if (weiTokensRaised < milestones[i].weiTokenAmount) {
        return (true, i);
      }
    }

    return (false, 0);
  }

  // fallback function can be used to buy tokens
  function () payable {
    buyTokens(msg.sender);
  }

  // low level token purchase function
  function buyTokens(address beneficiary) public atStage(Stages.Started) payable {
    require(beneficiary != 0x0);
    require(validPurchase());

    uint256 weiAmount = msg.value;

    // get milestone
    bool foundIndex;
    uint256 index;
    (foundIndex, index) = getCurrentMilestoneIndex();
    require(foundIndex);
    Milestone current = milestones[index];

    // calculate token amount to be created
    uint256 tokens = weiAmount.div(current.pricePerToken);
    uint256 weiTokens = tokens * 1 ether;

    // update state
    weiRaised = weiRaised.add(weiAmount);
    weiTokensRaised = weiTokensRaised.add(weiTokens);

    assert(token.transfer(beneficiary, weiTokens));
    TokenPurchase(msg.sender, beneficiary, weiAmount, weiTokens);

    forwardFunds();
  }

  // send ether to the fund collection wallet
  // override to create custom fund forwarding mechanisms
  function forwardFunds() internal {
    wallet.transfer(msg.value);
  }

  /**
  * @return bool true if the transaction can buy tokens
  */
  function validPurchase() internal constant returns (bool) {
    bool ended = hasEnded();
    bool nonZeroPurchase = msg.value != 0;
    return !ended && nonZeroPurchase;
  }

  /**
  * @return bool true if crowdsale event has ended
  */
  function hasEnded() constant public returns (bool) {
    return isStage(Stages.Finished);
  }

  /**
  * @dev Owner can start the crowdsale, initiating endTime.
  */
  function start () external onlyOwner atStage(Stages.Preparing) {
    require(milestones.length > 0);

    endTime = now.add(endSeconds);
    stage = Stages.Started;
  }

  /**
  * @dev When crowdsale has ended, anybody can burn the remaining tokens.
  */
  function burnTokens() external {
    require(hasEnded());

    uint256 amount = token.balanceOf(this);
    token.burn(amount);
  }
}