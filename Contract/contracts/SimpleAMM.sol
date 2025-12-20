// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// A very simplified constant-product AMM for two pairs seeded by owner.
contract SimpleAMM is Ownable, ReentrancyGuard {
    struct Reserves { uint112 reserveA; uint112 reserveB; }
    // pairKey = keccak256(abi.encodePacked(tokenA, tokenB)) where tokenA < tokenB
    mapping(bytes32 => Reserves) public pairs;

    event PairInitialized(address indexed tokenA, address indexed tokenB, uint256 amountA, uint256 amountB);
    event Swapped(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    constructor(address owner_) Ownable(owner_) {}

    function _sort(address a, address b) internal pure returns (address tokenA, address tokenB) {
        require(a != b, "identical");
        (tokenA, tokenB) = a < b ? (a, b) : (b, a);
    }

    function _key(address a, address b) internal pure returns (bytes32) {
        (address tokenA, address tokenB) = _sort(a, b);
        return keccak256(abi.encodePacked(tokenA, tokenB));
    }

    function initializePair(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external onlyOwner {
        require(amountA > 0 && amountB > 0, "zero");
        bytes32 k = _key(tokenA, tokenB);
        Reserves storage r = pairs[k];
        require(r.reserveA == 0 && r.reserveB == 0, "exists");
        // transfer in
        require(IERC20(tokenA).transferFrom(msg.sender, address(this), amountA), "tA");
        require(IERC20(tokenB).transferFrom(msg.sender, address(this), amountB), "tB");
        // store sorted order reserves
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

    // 0.3% fee
    uint256 public constant FEE_BPS = 30; // 0.3%

    function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) public view returns (uint256 amountOut) {
        bytes32 k = _key(tokenIn, tokenOut);
        Reserves memory r = pairs[k];
        require(r.reserveA > 0 && r.reserveB > 0, "no pair");
        (address tokenA, ) = _sort(tokenIn, tokenOut);
        (uint256 reserveIn, uint256 reserveOut) = tokenIn == tokenA ? (r.reserveA, r.reserveB) : (r.reserveB, r.reserveA);
        uint256 amountInWithFee = amountIn * (10_000 - FEE_BPS) / 10_000;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
    }

    function swapExactInput(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut) external nonReentrant returns (uint256 amountOut) {
        amountOut = getAmountOut(tokenIn, tokenOut, amountIn);
        require(amountOut >= minOut, "slippage");
        // pull
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "pull in");
        // push
        require(IERC20(tokenOut).transfer(msg.sender, amountOut), "push out");
        // update reserves
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
}
