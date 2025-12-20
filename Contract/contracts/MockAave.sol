// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AToken is ERC20, Ownable {
    constructor(address owner_) ERC20("aUSDT", "aUSDT") Ownable(owner_) {}
    function mint(address to, uint256 amount) external onlyOwner { _mint(to, amount); }
    function burn(address from, uint256 amount) external onlyOwner { _burn(from, amount); }
}

contract MockAavePool is Ownable {
    IERC20 public immutable USDT;
    AToken public immutable aUSDT;

    constructor(address usdt, address owner_) Ownable(owner_) {
        USDT = IERC20(usdt);
        // Set the aUSDT owner to this pool so it can mint/burn on supply/withdraw
        aUSDT = new AToken(address(this));
    }

    function supply(uint256 amount) external {
        require(amount > 0, "amount=0");
        require(USDT.transferFrom(msg.sender, address(this), amount), "transfer in");
        aUSDT.mint(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "amount=0");
        aUSDT.burn(msg.sender, amount);
        require(USDT.transfer(msg.sender, amount), "transfer out");
    }
}
