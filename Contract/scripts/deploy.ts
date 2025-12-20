import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const ONE_M = ethers.parseEther("1000000");

  const LENS = await ethers.getContractFactory("LENS");
  const lens = await LENS.deploy(deployer.address, ONE_M);
  await lens.waitForDeployment();

  const TestERC20 = await ethers.getContractFactory("TestERC20");
  const weth = await TestERC20.deploy("Wrapped ETH", "WETH", ONE_M, deployer.address);
  await weth.waitForDeployment();
  const usdt = await TestERC20.deploy("Tether USD", "USDT", ONE_M, deployer.address);
  await usdt.waitForDeployment();

  const SimpleAMM = await ethers.getContractFactory("SimpleAMM");
  const amm = await SimpleAMM.deploy(deployer.address);
  await amm.waitForDeployment();
  // Seed liquidity
  await (await lens.approve(await amm.getAddress(), ethers.parseEther("500000"))).wait();
  await (await weth.approve(await amm.getAddress(), ethers.parseEther("10000"))).wait();
  await (await amm.initializePair(await lens.getAddress(), await weth.getAddress(), ethers.parseEther("500000"), ethers.parseEther("10000"))).wait();

  await (await weth.approve(await amm.getAddress(), ethers.parseEther("5000"))).wait();
  await (await usdt.approve(await amm.getAddress(), ethers.parseEther("800000"))).wait();
  await (await amm.initializePair(await weth.getAddress(), await usdt.getAddress(), ethers.parseEther("5000"), ethers.parseEther("800000"))).wait();

  const MockAavePool = await ethers.getContractFactory("MockAavePool");
  const aave = await MockAavePool.deploy(await usdt.getAddress(), deployer.address);
  await aave.waitForDeployment();

  const CourseMarket = await ethers.getContractFactory("CourseMarket");
  const market = await CourseMarket.deploy(await lens.getAddress(), deployer.address, deployer.address, 500);
  await market.waitForDeployment();

  const Router = await ethers.getContractFactory("Router");
  const router = await Router.deploy(
    await lens.getAddress(),
    await weth.getAddress(),
    await usdt.getAddress(),
    await amm.getAddress(),
    await aave.getAddress(),
    deployer.address
  );
  await router.waitForDeployment();

  console.log("Deployer:", deployer.address);
  console.log("LENS:", await lens.getAddress());
  console.log("WETH:", await weth.getAddress());
  console.log("USDT:", await usdt.getAddress());
  console.log("AMM:", await amm.getAddress());
  console.log("Aave:", await aave.getAddress());
  console.log("Market:", await market.getAddress());
  console.log("Router:", await router.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
