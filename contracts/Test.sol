pragma solidity 0.4.18;

import "zeppelin-solidity/contracts/token/StandardToken.sol";
import "zeppelin-solidity/contracts/token/PausableToken.sol";
import "zeppelin-solidity/contracts/token/BurnableToken.sol";
import "zeppelin-solidity/contracts/token/VestedToken.sol";

contract Test is StandardToken, PausableToken, BurnableToken, VestedToken {
  string public constant name = "Test";
  string public constant symbol = "Test";
  uint8 public constant decimals = 18;

  uint256 public INITIAL_SUPPLY;

  function Test (uint256 _INITIAL_SUPPLY) {
    INITIAL_SUPPLY = _INITIAL_SUPPLY;
    totalSupply = _INITIAL_SUPPLY;
    balances[msg.sender] = _INITIAL_SUPPLY;
  }
}