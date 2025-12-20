const hre = require("hardhat");

async function main() {
  const courseMarketAddress = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
  
  console.log("🔍 测试合约调用...");
  console.log("CourseMarket 地址:", courseMarketAddress);
  
  // 获取合约实例
  const CourseMarket = await hre.ethers.getContractAt("CourseMarket", courseMarketAddress);
  
  try {
    // 调用 nextCourseId
    const nextId = await CourseMarket.nextCourseId();
    console.log("✅ nextCourseId:", nextId.toString());
    
    // 获取其他信息
    const lens = await CourseMarket.LENS();
    console.log("✅ LENS 地址:", lens);
    
    const feeBps = await CourseMarket.feeBps();
    console.log("✅ 手续费:", feeBps.toString(), "bps");
    
  } catch (error) {
    console.error("❌ 错误:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
