const fs = require('fs');
const path = require('path');

const artifactsDir = path.join(__dirname, '../artifacts/contracts');
const targetDir = path.join(__dirname, '../../Frontend/src/contracts');

// 确保目标目录存在
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 要复制的合约列表
const contracts = [
  'WETH9',
  'TestERC20',
  'SimpleAMM',
  'Router',
  'CourseMarket',
  'MockAavePool'
];

contracts.forEach(contractName => {
  const artifactPath = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`);
  
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    // 提取 ABI 和 bytecode
    const data = {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode
    };
    
    const targetPath = path.join(targetDir, `${contractName}.json`);
    fs.writeFileSync(targetPath, JSON.stringify(data, null, 2));
    console.log(`✓ Copied ${contractName}.json to Frontend`);
  } else {
    console.warn(`✗ Artifact not found: ${contractName}`);
  }
});

console.log('Artifact copy complete!');
