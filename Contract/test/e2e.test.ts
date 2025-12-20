import { expect } from "chai";
import { ethers } from "hardhat";

const toWei = (v: string) => ethers.parseEther(v);

describe("Web3 University E2E", function () {
  it("runs course buy and LENS->ETH->USDT->Aave deposit", async () => {
    const [owner, author, buyer] = await ethers.getSigners();

    const LENS = await ethers.getContractFactory("LENS");
    const lens = await LENS.deploy(owner.address, toWei("1000000"));

    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const weth = await TestERC20.deploy("Wrapped ETH", "WETH", toWei("1000000"), owner.address);
    const usdt = await TestERC20.deploy("Tether USD", "USDT", toWei("1000000"), owner.address);

    const SimpleAMM = await ethers.getContractFactory("SimpleAMM");
    const amm = await SimpleAMM.deploy(owner.address);

    // Seed liquidity pairs
    await lens.connect(owner).approve(await amm.getAddress(), toWei("500000"));
    await weth.connect(owner).approve(await amm.getAddress(), toWei("10000"));
    await amm.connect(owner).initializePair(await lens.getAddress(), await weth.getAddress(), toWei("500000"), toWei("10000"));

    await weth.connect(owner).approve(await amm.getAddress(), toWei("5000"));
    await usdt.connect(owner).approve(await amm.getAddress(), toWei("800000"));
    await amm.connect(owner).initializePair(await weth.getAddress(), await usdt.getAddress(), toWei("5000"), toWei("800000"));

    const MockAavePool = await ethers.getContractFactory("MockAavePool");
    const aave = await MockAavePool.deploy(await usdt.getAddress(), owner.address);

    const CourseMarket = await ethers.getContractFactory("CourseMarket");
    const market = await CourseMarket.deploy(await lens.getAddress(), owner.address, owner.address, 500);

    // Author creates a course
    const price = toWei("100");
    await expect(market.connect(author).createCourse(price, "ipfs://cid"))
      .to.emit(market, "CourseCreated");
    const courseId = await market.nextCourseId();

    // Fund buyer with LENS and approve
    await lens.connect(owner).mint(buyer.address, toWei("1000"));
    await lens.connect(buyer).approve(await market.getAddress(), price);

    // Buy course
    await expect(market.connect(buyer).buy(courseId)).to.emit(market, "Purchased");
    expect(await market.purchased(courseId, buyer.address)).to.eq(true);

    // Check payouts
    const fee = price * 500n / 10000n;
    const authorAmount = price - fee;
    expect(await lens.balanceOf(author.address)).to.eq(authorAmount);

    // Author converts LENS -> ETH -> USDT -> Aave via Router
    const Router = await ethers.getContractFactory("Router");
    const router = await Router.deploy(
      await lens.getAddress(), await weth.getAddress(), await usdt.getAddress(),
      await amm.getAddress(), await aave.getAddress(), owner.address);

    await lens.connect(author).approve(await router.getAddress(), authorAmount);

    // Do the route with zero slippage protection for test
    await expect(router.connect(author).depositToAaveFromLENS(authorAmount, 0, 0))
      .to.emit(router, "Deposited");

    // aUSDT should be minted to author with the same amount of USDT out from last swap
    const aTokenAddr = await aave.aUSDT();
    const aToken = await ethers.getContractAt("ERC20", aTokenAddr);
    const aBal = await aToken.balanceOf(author.address);
    expect(aBal).to.be.gt(0n);
  });
});
