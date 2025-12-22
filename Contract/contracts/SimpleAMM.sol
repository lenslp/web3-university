// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleAMM - 简化的自动做市商合约
 * @notice 支持恒定乘积做市（x * y = k），仅支持 ERC20 代币
 * @dev 遵循 DeFi 最佳实践，原生 ETH 需要先包装为 WETH
 */
contract SimpleAMM is Ownable, ReentrancyGuard {
    // ============ 常量 ============
    
    /// @notice 交易手续费（基点），30 = 0.3%
    uint256 public constant FEE_BPS = 30;
    
    // ============ 状态变量 ============
    
    /// @notice 储备量结构体
    /// @dev 使用 uint112 节省 gas，最大值约 5.2e15，对大多数代币足够
    struct Reserves { 
        uint112 reserveA;  // 代币 A 的储备量
        uint112 reserveB;  // 代币 B 的储备量
    }
    
    /// @notice 交易对映射：pairKey => Reserves
    /// @dev pairKey = keccak256(abi.encodePacked(tokenA, tokenB))，其中 tokenA < tokenB
    mapping(bytes32 => Reserves) public pairs;
    
    // ============ 事件 ============
    
    /// @notice 交易对初始化事件
    event PairInitialized(address indexed tokenA, address indexed tokenB, uint256 amountA, uint256 amountB);
    
    /// @notice 代币交换事件
    event Swapped(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    // ============ 构造函数 ============
    
    constructor(address owner_) Ownable(owner_) {}

    // ============ 内部函数 ============
    
    /**
     * @notice 对两个地址排序
     * @dev 确保配对的唯一性和一致性
     * @param a 地址 A
     * @param b 地址 B
     * @return tokenA 较小的地址
     * @return tokenB 较大的地址
     */
    function _sort(address a, address b) internal pure returns (address tokenA, address tokenB) {
        require(a != b, "identical");
        require(a != address(0) && b != address(0), "zero address");
        (tokenA, tokenB) = a < b ? (a, b) : (b, a);
    }

    /**
     * @notice 生成交易对的唯一键
     * @param a 代币 A 地址
     * @param b 代币 B 地址
     * @return 交易对的哈希键
     */
    function _key(address a, address b) internal pure returns (bytes32) {
        (address tokenA, address tokenB) = _sort(a, b);
        return keccak256(abi.encodePacked(tokenA, tokenB));
    }

    // ============ 管理员函数 ============
    
    /**
     * @notice 初始化交易对并添加流动性
     * @dev 只能由合约所有者调用，交易对只能初始化一次
     *      调用前需要先 approve 本合约足够的代币额度
     * @param tokenA 代币 A 地址（必须是 ERC20 代币，不支持原生 ETH）
     * @param tokenB 代币 B 地址（必须是 ERC20 代币，不支持原生 ETH）
     * @param amountA 代币 A 的数量
     * @param amountB 代币 B 的数量
     */
    function initializePair(
        address tokenA, 
        address tokenB, 
        uint256 amountA, 
        uint256 amountB
    ) external onlyOwner {
        require(amountA > 0 && amountB > 0, "zero amount");
        
        bytes32 k = _key(tokenA, tokenB);
        Reserves storage r = pairs[k];
        require(r.reserveA == 0 && r.reserveB == 0, "pair exists");
        
        // 转入代币（调用者需要提前 approve）
        require(
            IERC20(tokenA).transferFrom(msg.sender, address(this), amountA),
            "transfer A failed"
        );
        require(
            IERC20(tokenB).transferFrom(msg.sender, address(this), amountB),
            "transfer B failed"
        );
        
        // 按排序后的顺序存储储备量
        (address sA, ) = _sort(tokenA, tokenB);
        if (sA == tokenA) {
            r.reserveA = uint112(amountA);
            r.reserveB = uint112(amountB);
        } else {
            r.reserveA = uint112(amountB);
            r.reserveB = uint112(amountA);
        }
        
        emit PairInitialized(tokenA, tokenB, amountA, amountB);
    }

    // ============ 查询函数 ============
    
    /**
     * @notice 根据输入数量计算输出数量
     * @dev 使用恒定乘积公式：(x + Δx * 0.997) * (y - Δy) = x * y
     *      扣除 0.3% 手续费后计算输出量
     * @param tokenIn 输入代币地址
     * @param tokenOut 输出代币地址
     * @param amountIn 输入数量
     * @return amountOut 扣除手续费后的输出数量
     */
    function getAmountOut(
        address tokenIn, 
        address tokenOut, 
        uint256 amountIn
    ) public view returns (uint256 amountOut) {
        require(amountIn > 0, "zero input");
        
        bytes32 k = _key(tokenIn, tokenOut);
        Reserves memory r = pairs[k];
        require(r.reserveA > 0 && r.reserveB > 0, "pair not exists");
        
        // 获取输入和输出对应的储备量
        (address tokenA, ) = _sort(tokenIn, tokenOut);
        (uint256 reserveIn, uint256 reserveOut) = tokenIn == tokenA 
            ? (uint256(r.reserveA), uint256(r.reserveB)) 
            : (uint256(r.reserveB), uint256(r.reserveA));
        
        // 扣除 0.3% 手续费后计算输出量
        // amountOut = (amountIn * 0.997 * reserveOut) / (reserveIn + amountIn * 0.997)
        uint256 amountInWithFee = amountIn * (10_000 - FEE_BPS) / 10_000;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
    }

    // ============ 交易函数 ============
    
    /**
     * @notice 执行代币交换（精确输入）
     * @dev 仅支持 ERC20 代币，调用前需要先 approve 本合约足够的 tokenIn 额度
     *      如需交换原生 ETH，请先包装为 WETH
     * @param tokenIn 输入代币地址（必须是 ERC20）
     * @param tokenOut 输出代币地址（必须是 ERC20）
     * @param amountIn 精确的输入数量
     * @param minOut 最小输出数量（滑点保护，建议设置为预期值的 95%-99%）
     * @return amountOut 实际输出数量
     */
    function swapExactInput(
        address tokenIn, 
        address tokenOut, 
        uint256 amountIn, 
        uint256 minOut
    ) external nonReentrant returns (uint256 amountOut) {
        // 1. 参数校验
        require(amountIn > 0, "zero input");
        require(tokenIn != address(0) && tokenOut != address(0), "zero address");
        
        // 2. 计算输出数量
        amountOut = getAmountOut(tokenIn, tokenOut, amountIn);
        require(amountOut >= minOut, "slippage exceeded");
        
        // 3. 接收输入代币
        require(
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn),
            "transfer in failed"
        );
        
        // 4. 发送输出代币
        require(
            IERC20(tokenOut).transfer(msg.sender, amountOut),
            "transfer out failed"
        );
        
        // 5. 更新储备量
        bytes32 k = _key(tokenIn, tokenOut);
        Reserves storage r = pairs[k];
        (address tokenA, ) = _sort(tokenIn, tokenOut);
        
        if (tokenIn == tokenA) {
            r.reserveA = uint112(uint256(r.reserveA) + amountIn);
            r.reserveB = uint112(uint256(r.reserveB) - amountOut);
        } else {
            r.reserveA = uint112(uint256(r.reserveA) - amountOut);
            r.reserveB = uint112(uint256(r.reserveB) + amountIn);
        }
        
        emit Swapped(tokenIn, tokenOut, amountIn, amountOut);
    }
    
    // ============ 查询函数 ============
    
    /**
     * @notice 获取交易对的储备量
     * @param tokenA 代币 A 地址
     * @param tokenB 代币 B 地址
     * @return reserveA 代币 A 的储备量
     * @return reserveB 代币 B 的储备量
     */
    function getReserves(
        address tokenA, 
        address tokenB
    ) external view returns (uint256 reserveA, uint256 reserveB) {
        bytes32 k = _key(tokenA, tokenB);
        Reserves memory r = pairs[k];
        
        (address sortedA, ) = _sort(tokenA, tokenB);
        if (sortedA == tokenA) {
            (reserveA, reserveB) = (r.reserveA, r.reserveB);
        } else {
            (reserveA, reserveB) = (r.reserveB, r.reserveA);
        }
    }
}
