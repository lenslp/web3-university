const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  const courseMarketAddress = "0x7a2088a1bFc9d81c55368AE168C2C02570cB814F";
  const CourseMarket = await hre.ethers.getContractAt("CourseMarket", courseMarketAddress);
  
  console.log("Testing with deployer:", deployer.address);
  
  // 创建一个测试课程
  console.log("\n1. Creating test course...");
  const price = hre.ethers.parseEther("100");
  const uri = JSON.stringify({ title: "Test Course", description: "Test", duration: "1 week" });
  
  const createTx = await CourseMarket.createCourse(price, uri);
  await createTx.wait();
  console.log("Course created!");
  
  const nextId = await CourseMarket.nextCourseId();
  const courseId = nextId - 1n;
  console.log("Course ID:", courseId.toString());
  
  // 测试更新
  console.log("\n2. Testing updateCourse...");
  const newPrice = hre.ethers.parseEther("150");
  const newUri = JSON.stringify({ title: "Updated Course", description: "Updated", duration: "2 weeks" });
  
  try {
    const updateTx = await CourseMarket.updateCourse(courseId, newPrice, newUri);
    await updateTx.wait();
    console.log("✓ Update successful!");
  } catch (error) {
    console.log("✗ Update failed:", error.message);
  }
  
  // 测试删除
  console.log("\n3. Testing deactivateCourse...");
  try {
    const deactivateTx = await CourseMarket.deactivateCourse(courseId);
    await deactivateTx.wait();
    console.log("✓ Deactivate successful!");
  } catch (error) {
    console.log("✗ Deactivate failed:", error.message);
  }
  
  // 查看最终状态
  const course = await CourseMarket.courses(courseId);
  console.log("\n4. Final course state:");
  console.log("  Author:", course.author);
  console.log("  Price:", hre.ethers.formatEther(course.price));
  console.log("  Active:", course.active);
  console.log("  Exists:", course.exists);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
