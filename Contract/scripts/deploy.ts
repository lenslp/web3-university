import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1. 部署 WETH 代币
  console.log("\n1. Deploying WETH token...");
  const WETH = await ethers.getContractFactory("WETH9");
  const weth = await WETH.deploy();
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log("WETH deployed to:", wethAddress);

  // 2. 部署 LENS 代币
  console.log("\n2. Deploying LENS token...");
  const ONE_M = ethers.parseEther("1000000");
  const LENS = await ethers.getContractFactory("LENS");
  const lens = await LENS.deploy(deployer.address, ONE_M);
  await lens.waitForDeployment();
  const lensAddress = await lens.getAddress();
  console.log("LENS deployed to:", lensAddress);

  // 3. 部署 USDT 代币（模拟稳定币）
  console.log("\n3. Deploying USDT token...");
  const TestERC20 = await ethers.getContractFactory("TestERC20");
  const usdt = await TestERC20.deploy("Tether USD", "USDT", ONE_M, deployer.address);
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("USDT deployed to:", usdtAddress);

  // 4. 部署 SimpleAMM
  console.log("\n4. Deploying SimpleAMM...");
  const SimpleAMM = await ethers.getContractFactory("SimpleAMM");
  const amm = await SimpleAMM.deploy(deployer.address);
  await amm.waitForDeployment();
  const ammAddress = await amm.getAddress();
  console.log("SimpleAMM deployed to:", ammAddress);

  // 5. 部署 MockAavePool
  console.log("\n5. Deploying MockAavePool...");
  const MockAavePool = await ethers.getContractFactory("MockAavePool");
  const aave = await MockAavePool.deploy(usdtAddress, deployer.address);
  await aave.waitForDeployment();
  const aaveAddress = await aave.getAddress();
  console.log("MockAavePool deployed to:", aaveAddress);

  // 6. 部署 CourseMarket
  console.log("\n6. Deploying CourseMarket...");
  const CourseMarket = await ethers.getContractFactory("CourseMarket");
  const market = await CourseMarket.deploy(lensAddress, deployer.address, deployer.address, 500);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log("CourseMarket deployed to:", marketAddress);

  // 7. 部署 Router
  console.log("\n7. Deploying Router...");
  const Router = await ethers.getContractFactory("Router");
  const router = await Router.deploy(
    lensAddress,
    wethAddress, // 使用 WETH 代替原生 ETH
    usdtAddress,
    ammAddress,
    aaveAddress,
    deployer.address
  );
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("Router deployed to:", routerAddress);

  // 8. 给 deployer 一些 WETH（包装 10 ETH）
  console.log("\n8. Wrapping ETH to WETH...");
  const wethAmount = ethers.parseEther("10"); // 10 ETH
  let tx = await weth.deposit({ value: wethAmount });
  await tx.wait();
  console.log("✅ Wrapped 10 ETH to WETH");

  // 9. 初始化 AMM 流动性池
  console.log("\n9. Initializing AMM liquidity pools...");
  
  // 9.1 WETH-LENS 池：5 WETH + 500,000 LENS (1 WETH ≈ 100,000 LENS)
  const wethLiquidity = ethers.parseEther("5");
  const lensForWeth = ethers.parseEther("500000");
  
  console.log("Approving WETH for WETH-LENS pair...");
  tx = await weth.approve(ammAddress, wethLiquidity);
  await tx.wait();
  
  console.log("Approving LENS for WETH-LENS pair...");
  tx = await lens.approve(ammAddress, lensForWeth);
  await tx.wait();
  
  console.log("Initializing WETH-LENS pair...");
  tx = await amm.initializePair(wethAddress, lensAddress, wethLiquidity, lensForWeth);
  await tx.wait();
  console.log("✅ WETH-LENS pool initialized");
  console.log("   WETH: 5");
  console.log("   LENS: 500,000");
  console.log("   Initial price: 1 WETH ≈ 100,000 LENS");
  
  // 9.2 LENS-USDT 池：500,000 LENS + 10,000 USDT (1 LENS ≈ 0.02 USDT)
  const lensForUsdt = ethers.parseEther("500000");
  const usdtLiquidity = ethers.parseEther("10000");
  
  console.log("\nApproving LENS for LENS-USDT pair...");
  tx = await lens.approve(ammAddress, lensForUsdt);
  await tx.wait();
  
  console.log("Approving USDT for LENS-USDT pair...");
  tx = await usdt.approve(ammAddress, usdtLiquidity);
  await tx.wait();
  
  console.log("Initializing LENS-USDT pair...");
  tx = await amm.initializePair(lensAddress, usdtAddress, lensForUsdt, usdtLiquidity);
  await tx.wait();
  console.log("✅ LENS-USDT pool initialized");
  console.log("   LENS: 500,000");
  console.log("   USDT: 10,000");
  console.log("   Initial price: 1 LENS ≈ 0.02 USDT");

  // 10. 输出所有合约地址
  console.log("\n" + "=".repeat(60));
  console.log("📋 Deployment Summary");
  console.log("=".repeat(60));
  console.log("WETH Token:      ", wethAddress);
  console.log("LENS Token:      ", lensAddress);
  console.log("USDT Token:      ", usdtAddress);
  console.log("SimpleAMM:       ", ammAddress);
  console.log("MockAavePool:    ", aaveAddress);
  console.log("CourseMarket:    ", marketAddress);
  console.log("Router:          ", routerAddress);
  console.log("=".repeat(60));
  console.log("\n✅ All contracts deployed successfully!");
  console.log("\n💡 Next steps:");
  console.log("1. Update Frontend/.env.local with these addresses");
  console.log("2. Users need to wrap ETH to WETH before buying LENS");
  console.log("3. Use WETH-LENS pool to swap WETH for LENS tokens");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
