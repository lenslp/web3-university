# 个人中心功能说明

## 功能概述
个人中心页面已完善，用户可以查看和修改个人信息，修改时需要使用钱包签名验证，信息保存在 PostgreSQL 数据库中。

## 功能特性

### 1. 查看个人资料
- 自动从数据库加载用户信息
- 显示钱包地址、加入日期、统计数据和成就
- 未连接钱包时提示用户连接

### 2. 修改个人资料
编辑以下字段：
- **名字** - 最多 120 个字符
- **邮箱** - 最多 200 个字符
- **个人简介** - 文本区域
- **头像** - 6 个表情可选：🧑, 👨‍💼, 👩‍💼, 🧑‍🎓, 🧑‍💻, 🤓

### 3. 签名验证
- 用户点击"保存"按钮后，调用 wagmi 的 `signMessageAsync` 进行钱包签名
- 前端使用 viem 签名，后端使用 viem 的 `recoverMessageAddress` 验证签名
- 签名通过后才会更新数据库

## 技术栈

### Frontend
- **框架**: Next.js 15 (React 19)
- **钱包集成**: wagmi 2.x + viem 2.x + RainbowKit
- **状态管理**: React hooks
- **UI**: Tailwind CSS

### Backend
- **框架**: NestJS
- **数据库**: PostgreSQL + Prisma ORM
- **签名验证**: viem 的 `recoverMessageAddress`
- **验证**: class-validator

## API 端点

### GET /profile?address=0x...
获取用户个人资料
- **请求**: 查询参数 `address`
- **响应**: Profile 对象
  ```json
  {
    "walletAddress": "0x...",
    "name": "用户名",
    "email": "邮箱@example.com",
    "bio": "个人简介",
    "avatar": "🧑",
    "joinDate": "2024-12-22",
    "totalCourses": 0,
    "totalStudying": 0,
    "totalSpent": 0,
    "rating": 0,
    "achievements": []
  }
  ```

### POST /profile
更新用户个人资料（需要签名验证）
- **请求体**:
  ```json
  {
    "address": "0x...",
    "message": "Update profile for 0x...",
    "signature": "0x...",
    "profile": {
      "name": "新用户名",
      "email": "新邮箱@example.com",
      "bio": "新简介",
      "avatar": "👨‍💼"
    }
  }
  ```
- **验证流程**:
  1. 使用 viem 的 `recoverMessageAddress` 恢复签名地址
  2. 对比恢复地址与请求地址（忽略大小写）
  3. 地址匹配时保存到数据库，否则返回 401 Unauthorized

## 数据库 Schema

```prisma
model Profile {
  walletAddress String   @id @db.VarChar(80)
  name          String   @default("") @db.VarChar(120)
  email         String   @default("") @db.VarChar(200)
  bio           String   @default("") @db.Text
  avatar        String   @default("🧑") @db.VarChar(16)
  joinDate      String   @default("") @db.VarChar(32)
  totalCourses  Int      @default(0)
  totalStudying Int      @default(0)
  totalSpent    Int      @default(0)
  rating        Float    @default(0)
  achievements  String[] @default([])

  @@map("profiles")
}
```

## 使用流程

### 用户查看资料
1. 打开 `/student/profile` 页面
2. 连接钱包（如未连接）
3. 页面自动加载用户信息
4. 页面首次加载时会调用 `GET /profile?address=0x...`

### 用户修改资料
1. 点击"编辑个人资料"按钮
2. 在表单中修改信息：
   - 修改文本字段（名字、邮箱、简介）
   - 或选择新头像
3. 点击"保存"按钮
4. 前端调用钱包签名（需用户确认）
5. 后端验证签名并保存到数据库
6. 页面更新显示新信息
7. 显示"Profile updated successfully!" 成功提示

### 错误处理
- **钱包未连接**: 显示"连接钱包"提示
- **签名失败**: 显示错误消息，不上传数据
- **签名验证失败**: 返回 401，显示"Signature verification failed"
- **数据库错误**: 返回错误消息

## 环境配置

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/web3_university
PORT=3001
```

## 启动步骤

1. **启动后端**
   ```bash
   cd Backend
   pnpm install
   pnpm db:push  # 同步 Prisma schema
   pnpm start
   ```

2. **启动前端**
   ```bash
   cd Frontend
   pnpm install
   pnpm dev
   ```

3. **访问个人中心**
   - 打开 http://localhost:3000/student/profile
   - 连接钱包
   - 查看和编辑个人信息

## 注意事项

1. **签名验证**: 签名采用 EIP-191 标准，确保只有钱包所有者能修改自己的信息
2. **地址规范化**: 所有地址都转为小写存储和比对
3. **数据初始化**: 首次访问用户会自动创建记录，包含默认值
4. **头像选择**: 支持任意 Unicode 表情符号，但 UI 提供了 6 个预设选项

## 教师中心 - LENS 理财功能

### 功能概述
教师可以将课程销售获得的 LENS 代币一键质押到 AAVE 协议进行理财，自动完成 LENS → WETH → USDT 的兑换并质押，获得生息凭证 aUSDT。

### 理财流程

#### 1. 自动化兑换链路
```
LENS (课程收益)
  ↓ 通过 AMM 兑换
WETH (包装 ETH)
  ↓ 通过 AMM 兑换
USDT (稳定币)
  ↓ 质押到 AAVE
aUSDT (生息凭证)
```

#### 2. 核心合约函数
**Router.sol - `depositToAaveFromLENS`**
```solidity
function depositToAaveFromLENS(
    uint256 amountIn,      // LENS 数量
    uint256 minEthOut,     // WETH 最小输出（滑点保护）
    uint256 minUsdtOut     // USDT 最小输出（滑点保护）
) external {
    // 1. 从用户拉取 LENS
    LENS.transferFrom(msg.sender, address(this), amountIn);
    
    // 2. LENS → WETH
    LENS.approve(address(amm), amountIn);
    uint256 ethOut = amm.swapExactInput(address(LENS), address(WETH), amountIn, minEthOut);
    
    // 3. WETH → USDT
    IERC20(WETH).approve(address(amm), ethOut);
    uint256 usdtOut = amm.swapExactInput(address(WETH), address(USDT), ethOut, minUsdtOut);
    
    // 4. 质押到 AAVE
    USDT.approve(address(aave), usdtOut);
    aave.supply(usdtOut);
    
    // 5. 转 aUSDT 给用户
    IERC20(aave.aUSDT()).transfer(msg.sender, usdtOut);
}
```

### aUSDT 生息机制

#### USDT vs aUSDT
| 类型 | 是否生息 | 余额变化 | 赎回方式 |
|------|---------|---------|---------|
| USDT | ❌ 不生息 | 永远不变 | - |
| aUSDT | ✅ 自动生息 | 随时间增长 | 随时赎回为 USDT |

#### 利息计算原理
- **AAVE 协议机制**: 借款人支付的利息 → 按比例分配给存款人
- **aUSDT 汇率增长**: 
  - 初始：1 aUSDT = 1 USDT
  - 一年后（假设 5% APY）：1 aUSDT = 1.05 USDT
- **余额自动增值**:
  ```
  存入 100 USDT → 获得 100 aUSDT
  一年后余额自动变成 105 aUSDT（代表 105 USDT）
  ```

### 前端实现

#### 页面路由
- **理财中心**: `/teacher/finance`
- **入口**: 教师首页新增"理财中心"按钮

#### 核心功能
1. **余额显示**: 实时查询 LENS 余额
2. **金额输入**: 支持手动输入 + 一键最大
3. **滑点设置**: 0.5% / 1% / 2% / 5% 可选
4. **输出预估**: 根据 AMM 汇率估算最终 USDT 数量
5. **一键质押**: 
   - 授权 Router 使用 LENS
   - 调用 `depositToAaveFromLENS`
   - 用户确认两笔交易

#### 交易流程
```typescript
// 1. 授权 LENS
await publicClient.writeContract({
  address: lensTokenAddress,
  abi: LENS_ABI,
  functionName: 'approve',
  args: [routerAddress, amount],
});

// 2. 质押
await publicClient.writeContract({
  address: routerAddress,
  abi: RouterArtifact.abi,
  functionName: 'depositToAaveFromLENS',
  args: [amount, minEthOut, minUsdtOut],
});
```

### 本地测试 vs 真实网络

#### 当前实现（本地测试）
- **使用**: `depositToAaveFromLENS` → MockAavePool
- **适用**: Hardhat 本地网络开发测试
- **特点**: 不需要真实 AAVE 协议

#### 真实网络部署
- **使用**: `depositToAaveV3FromLENS` → 真实 Aave V3 Pool
- **切换步骤**:
  1. 合约设置真实 Pool 地址：
     ```solidity
     router.setPoolV3("0xAaveV3PoolAddress"); // Sepolia 真实地址
     ```
  2. 前端改调用函数：
     ```typescript
     functionName: 'depositToAaveV3FromLENS',
     ```
- **AAVE 地址**: https://aave.com/docs/resources/addresses

### 平台费用机制

#### CourseMarket 分账逻辑
```solidity
constructor(
    address lens,
    address owner_,
    address feeRecipient_,  // 平台费接收地址
    uint96 feeBps_          // 费率（基点）
)

// 购买课程时
uint256 fee = (price * feeBps) / 10_000;      // 平台费
uint256 authorAmount = price - fee;            // 教师实收

LENS.transferFrom(msg.sender, author, authorAmount);      // 教师收益
LENS.transferFrom(msg.sender, feeRecipient, fee);         // 平台费
```

#### 费率说明
- **单位**: 基点（basis points）
- **换算**: `feeBps / 100 = 百分比`
- **示例**:
  - 500 feeBps = 5%
  - 1000 feeBps = 10%
  - 100 feeBps = 1%

#### 实际案例
课程价格 11 LENS，feeBps = 500（5%）：
```
平台费 = (11 × 500) / 10000 = 0.55 LENS
教师实收 = 11 - 0.55 = 10.45 LENS
```

**注意**: 如果 deployer 地址 = 平台费地址 = 教师地址（本地测试常见），教师会收到全额 11 LENS（两笔都到同一地址）。

### 部署配置

#### 本地开发
```typescript
// deploy.ts
const [deployer, feeRecipient] = await ethers.getSigners();

const market = await CourseMarket.deploy(
  lensAddress,
  deployer.address,       // 合约所有者
  feeRecipient.address,   // 平台费地址（建议用不同账户）
  500                     // 5% 平台费
);
```

#### 账户说明
- **deployer**: 部署合约的账户（Hardhat 测试账户）
- **教师地址**: 前端连接的钱包地址（创建课程时的 msg.sender）
- **平台费地址**: 接收平台费的地址（可与 deployer 不同）

### 安全提示

1. **滑点保护**: 设置合理的滑点容忍度，避免兑换损失过大
2. **授权管理**: Router 预授权 AMM，减少用户交易次数
3. **aUSDT 赎回**: 用户随时可以将 aUSDT 赎回为 USDT + 利息
4. **操作不可逆**: 质押前请仔细确认金额

## 改进方向

- [ ] 添加更多统计字段（学习时长、完成度等）
- [ ] 实现头像上传到云存储
- [ ] 添加个人成就系统和自动更新逻辑
- [ ] 实现用户排行榜功能
- [ ] 添加个人资料完整度提示
- [ ] 显示实时 AAVE APY 收益率
- [ ] 添加 aUSDT 余额查询和赎回功能
- [ ] 支持批量理财操作
