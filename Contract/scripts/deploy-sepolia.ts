import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Aave Pool & USDT from env
  const aavePool = process.env.AAVE_POOL_SEPOLIA || "";
  const usdtAddr = process.env.USDT_SEPOLIA || "";
  if (!aavePool || !usdtAddr) throw new Error("Missing AAVE_POOL_SEPOLIA or USDT_SEPOLIA");

  const ONE_M = ethers.parseEther("100000000");

  // Deploy LENS
  const LENS = await ethers.getContractFactory("LENS");
  const lens = await LENS.deploy(deployer.address, ONE_M);
  await lens.waitForDeployment();
  console.log("LENS:", await lens.getAddress());

  // Deploy TestERC20 for WETH (Sepolia already has WETH but for simplicity we deploy our own for AMM)
  const TestERC20 = await ethers.getContractFactory("TestERC20");
  const weth = await TestERC20.deploy("Wrapped ETH", "WETH", ONE_M, deployer.address);
  await weth.waitForDeployment();
  console.log("WETH:", await weth.getAddress());

  // Deploy SimpleAMM
  const SimpleAMM = await ethers.getContractFactory("SimpleAMM");
  const amm = await SimpleAMM.deploy(deployer.address);
  await amm.waitForDeployment();
  console.log("AMM:", await amm.getAddress());

  // Seed liquidity: LENS/WETH & WETH/USDT
  console.log("Seeding liquidity...");
  const lensAddr = await lens.getAddress();
  const wethAddr = await weth.getAddress();
  const ammAddr = await amm.getAddress();

  await (await lens.approve(ammAddr, ethers.parseEther("50000000"))).wait();
  await (await weth.approve(ammAddr, ethers.parseEther("100"))).wait();
  await (await amm.initializePair(lensAddr, wethAddr, ethers.parseEther("50000000"), ethers.parseEther("100"))).wait();
  console.log("LENS/WETH pair initialized");

  // For WETH/USDT we need to use the real USDT on Sepolia; check if we have it; if not, skip or use faucet
  // Simplified: assume deployer holds some USDT; otherwise this will fail
  const usdt = await ethers.getContractAt("IERC20", usdtAddr);
  const usdtBal = await usdt.balanceOf(deployer.address);
  console.log("Deployer USDT balance:", ethers.formatUnits(usdtBal, 6)); // USDT is 6 decimals
  
  // Attempt to seed WETH/USDT pair (adjust amounts if needed)
  // USDT on Sepolia uses 6 decimals
  const usdtAmount = ethers.parseUnits("800000", 6);
  if (usdtBal >= usdtAmount) {
    await (await weth.approve(ammAddr, ethers.parseEther("5000"))).wait();
    await (await usdt.approve(ammAddr, usdtAmount)).wait();
    await (await amm.initializePair(wethAddr, usdtAddr, ethers.parseEther("5000"), usdtAmount)).wait();
    console.log("WETH/USDT pair initialized");
  } else {
    console.warn("Insufficient USDT balance to seed WETH/USDT pair. Skip or get USDT from faucet.");
  }

  // Deploy CourseMarket
  const CourseMarket = await ethers.getContractFactory("CourseMarket");
  const market = await CourseMarket.deploy(lensAddr, deployer.address, deployer.address, 500);
  await market.waitForDeployment();
  console.log("CourseMarket:", await market.getAddress());

  // Deploy Router with Aave v3 pool
  const Router = await ethers.getContractFactory("Router");
  const router = await Router.deploy(lensAddr, wethAddr, usdtAddr, ammAddr, ethers.ZeroAddress, deployer.address);
  await router.waitForDeployment();
  const routerAddr = await router.getAddress();
  console.log("Router:", routerAddr);

  // Set Aave v3 pool
  await (await router.setPoolV3(aavePool)).wait();
  console.log("Router poolV3 set to:", aavePool);

  console.log("\n=== Deployment Summary ===");
  console.log("LENS:", lensAddr);
  console.log("WETH:", wethAddr);
  console.log("USDT:", usdtAddr);
  console.log("AMM:", ammAddr);
  console.log("CourseMarket:", await market.getAddress());
  console.log("Router:", routerAddr);
  console.log("Aave Pool:", aavePool);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
