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
    address public aggregator; // 1inch Aggregation Router

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
    function setAggregator(address agg_) external onlyOwner { aggregator = agg_; }

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
     * @notice 通过 1inch 聚合器完成 LENS→USDT，然后存入 AAVE v3（或本地池）
     * @dev 依赖外部通过 1inch API 构造的 calldata。该 calldata 应以 Router 为调用者（fromAddress=Router），
     *      并将产出 USDT 发送到 Router 地址（receiver=Router）。本函数会校验最终 USDT 余额 >= minUsdtOut。
     * @param amountIn 用户希望投入的 LENS 数量
     * @param minUsdtOut 滑点保护的最小 USDT 输出
     * @param usePoolV3 是否使用 AAVE v3 Pool（true）或本地 MockAave（false）
     * @param data 1inch 聚合器的完整调用数据（calldata）
     */
    function depositLensVia1Inch(
        uint256 amountIn,
        uint256 minUsdtOut,
        bool usePoolV3,
        bytes calldata data
    ) external {
        require(amountIn > 0, "amount=0");
        require(aggregator != address(0), "aggregator=0");

        // 1) 从用户拉取 LENS
        require(LENS.transferFrom(msg.sender, address(this), amountIn), "pull LENS");

        // 2) 允许聚合器花费 LENS（为避免残留授权，可设置为本次额度；如需性能可改为无限额并在运营上管控）
        LENS.approve(aggregator, amountIn);

        // 3) 记录调用前 USDT 余额
        uint256 usdtBefore = USDT.balanceOf(address(this));

        // 4) 调用 1inch 聚合器
        (bool ok, bytes memory ret) = aggregator.call(data);
        require(ok, "agg call fail");
        // 可选：解析 ret 以获取兑换详情；这里不强制

        // 5) 校验 USDT 最小产出
        uint256 usdtAfter = USDT.balanceOf(address(this));
        uint256 usdtOut = usdtAfter - usdtBefore;
        require(usdtOut >= minUsdtOut, "slippage");

        // 6) 存入 AAVE 或本地池，并将 aUSDT/代币记到用户
        if (usePoolV3) {
            require(address(poolV3) != address(0), "poolV3=0");
            USDT.approve(address(poolV3), usdtOut);
            poolV3.supply(address(USDT), usdtOut, msg.sender, 0);
        } else {
            USDT.approve(address(aave), usdtOut);
            aave.supply(usdtOut);
            IERC20(aave.aUSDT()).transfer(msg.sender, usdtOut);
        }
        // 7) 事件（注意：此处 ethOut 不适用 1inch 路径，统一以 0 标记或另行扩展事件）
        emit Deposited(msg.sender, amountIn, 0, usdtOut);
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
