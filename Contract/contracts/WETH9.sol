pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Wrapped Ether (WETH9-like) minimal implementation using ERC20
contract WETH9 is ERC20 {
    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    constructor() ERC20("Wrapped Ether", "WETH") {}

    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        require(msg.value > 0, "zero deposit");
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "zero withdraw");
        require(balanceOf(msg.sender) >= amount, "insufficient WETH");
        _burn(msg.sender, amount);
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "ETH transfer failed");
        emit Withdrawal(msg.sender, amount);
    }
}
