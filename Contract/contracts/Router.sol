// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPool} from "./interfaces/IPool.sol";

interface IAMM {
    function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256);
    function swapExactInput(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut) external returns (uint256);
}

interface IAaveLike {
    function supply(uint256 amount) external;
    function aUSDT() external view returns (address);
}

contract Router is Ownable {
    IERC20 public immutable LENS;
    IERC20 public immutable WETH;
    IERC20 public immutable USDT;
    IAMM public amm;
    IAaveLike public aave; // local mock pool
    IPool public poolV3;   // real Aave v3 pool

    constructor(address lens, address weth, address usdt, address amm_, address aave_, address owner_) Ownable(owner_) {
        LENS = IERC20(lens);
        WETH = IERC20(weth);
        USDT = IERC20(usdt);
        amm = IAMM(amm_);
        aave = IAaveLike(aave_);
    }

    function setAmm(address amm_) external onlyOwner { amm = IAMM(amm_); }
    function setAave(address aave_) external onlyOwner { aave = IAaveLike(aave_); }
    function setPoolV3(address pool_) external onlyOwner { poolV3 = IPool(pool_); }

    function depositToAaveFromLENS(uint256 amountIn, uint256 minEthOut, uint256 minUsdtOut) external {
        require(amountIn > 0, "amount=0");
        // 1) pull LENS from user
        require(LENS.transferFrom(msg.sender, address(this), amountIn), "pull LENS");
        // approve & swap LENS -> WETH
        LENS.approve(address(amm), amountIn);
        uint256 ethOut = amm.swapExactInput(address(LENS), address(WETH), amountIn, minEthOut);
        // approve & swap WETH -> USDT
        WETH.approve(address(amm), ethOut);
        uint256 usdtOut = amm.swapExactInput(address(WETH), address(USDT), ethOut, minUsdtOut);
        // approve & supply to MockAave then forward aUSDT to user
        USDT.approve(address(aave), usdtOut);
        aave.supply(usdtOut);
        IERC20(aave.aUSDT()).transfer(msg.sender, usdtOut);
        emit Deposited(msg.sender, amountIn, ethOut, usdtOut);
    }

    function depositToAaveV3FromLENS(uint256 amountIn, uint256 minEthOut, uint256 minUsdtOut) external {
        require(address(poolV3) != address(0), "poolV3=0");
        require(amountIn > 0, "amount=0");
        require(LENS.transferFrom(msg.sender, address(this), amountIn), "pull LENS");
        LENS.approve(address(amm), amountIn);
        uint256 ethOut = amm.swapExactInput(address(LENS), address(WETH), amountIn, minEthOut);
        WETH.approve(address(amm), ethOut);
        uint256 usdtOut = amm.swapExactInput(address(WETH), address(USDT), ethOut, minUsdtOut);
        USDT.approve(address(poolV3), usdtOut);
        poolV3.supply(address(USDT), usdtOut, msg.sender, 0);
        emit Deposited(msg.sender, amountIn, ethOut, usdtOut);
    }

    event Deposited(address indexed user, uint256 lensIn, uint256 ethOut, uint256 usdtOut);
}
