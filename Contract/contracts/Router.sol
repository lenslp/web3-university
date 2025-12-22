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

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

contract Router is Ownable {
    IERC20 public immutable LENS;
    IWETH public immutable WETH;
    IERC20 public immutable USDT;
    IAMM public amm;
    IAaveLike public aave; // local mock pool
    IPool public poolV3;   // real Aave v3 pool

    constructor(address lens, address weth, address usdt, address amm_, address aave_, address owner_) Ownable(owner_) {
        LENS = IERC20(lens);
        WETH = IWETH(weth);
        USDT = IERC20(usdt);
        amm = IAMM(amm_);
        aave = IAaveLike(aave_);
        // 预授权：允许 AMM 从 Router 拉取 WETH（无限额度），以便单笔交易完成包裹与交换
        IERC20(weth).approve(amm_, type(uint256).max);
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
        IERC20(address(WETH)).approve(address(amm), ethOut);
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
        IERC20(address(WETH)).approve(address(amm), ethOut);
        uint256 usdtOut = amm.swapExactInput(address(WETH), address(USDT), ethOut, minUsdtOut);
        USDT.approve(address(poolV3), usdtOut);
        poolV3.supply(address(USDT), usdtOut, msg.sender, 0);
        emit Deposited(msg.sender, amountIn, ethOut, usdtOut);
    }

    /**
     * @notice 单步用原生 ETH 兑换 LENS（用户只需一次交易）
     * @param minOut 滑点保护的最小 LENS 输出
     * @return amountOut 实际得到的 LENS 数量
     */
    function swapEthForLens(uint256 minOut) external payable returns (uint256 amountOut) {
        require(msg.value > 0, "eth=0");
        // 1) 包装 ETH 为 WETH（WETH 将记入 Router 余额）
        WETH.deposit{value: msg.value}();
        // 2) 通过 AMM 以 Router 为调用者进行兑换（AMM 会从 Router 拉取 WETH）
        amountOut = amm.swapExactInput(address(WETH), address(LENS), msg.value, minOut);
        // 3) 将得到的 LENS 转给用户
        require(LENS.transfer(msg.sender, amountOut), "push LENS");
    }

    event Deposited(address indexed user, uint256 lensIn, uint256 ethOut, uint256 usdtOut);
}
