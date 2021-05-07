pragma solidity ^0.6.2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CurrencyToken is ERC20 {
    constructor() public ERC20("VNDTrency", "VNDT") {
        _setupDecimals(0);
        _mint(msg.sender, 1000000);
    }
}
