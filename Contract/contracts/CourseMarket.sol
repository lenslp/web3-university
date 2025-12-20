// SPDX-License-Identifier: MIT
// 许可证声明
pragma solidity ^0.8.24;
// solidity 版本

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// 引入 ERC20 接口
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
// 引入所有者权限控制
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// 引入重入保护

contract CourseMarket is Ownable, ReentrancyGuard { // 课程市场合约，继承可拥有者和重入保护
    struct Course { // 课程结构体
        address author; // 作者地址
        uint256 price; // in LENS // 课程价格（以 LENS 计价）
        string uri; // IPFS CID // 课程元数据 URI
        bool exists; // 是否存在标记
        bool active; // 是否活跃（false 表示已删除/停用）
    }

    // 用于返回课程信息的结构体（包含课程ID和详细信息）
    struct CourseInfo {
        uint256 id; // 课程ID
        address author; // 作者地址
        uint256 price; // 课程价格
        string uri; // 课程元数据URI
    }

    IERC20 public immutable LENS; // LENS 代币合约实例
    uint256 public nextCourseId; // 下一个课程 ID 计数器
    uint96 public feeBps; // 平台费率（基点）
    address public feeRecipient; // 平台费接收地址

    // 课程详情映射
    mapping(uint256 => Course) public courses; // 按课程 ID 存储课程
    // 购买状态映射
    mapping(uint256 => mapping(address => bool)) public purchased; // 记录某用户是否已购某课程

    event CourseCreated(uint256 indexed courseId, address indexed author, uint256 price, string uri); // 课程创建事件
    event Purchased(uint256 indexed courseId, address indexed buyer, uint256 price, uint256 fee, uint256 authorAmount); // 购买事件
    event CourseUpdated(uint256 indexed courseId, uint256 newPrice, string newUri); // 课程更新事件
    event CourseDeactivated(uint256 indexed courseId); // 课程停用事件

    constructor(address lens, address owner_, address feeRecipient_, uint96 feeBps_) Ownable(owner_) { // 构造函数，初始化参数
        require(lens != address(0), "LENS=0"); // 确保 LENS 地址非零
        require(feeBps_ <= 10_000, "fee too high"); // 确保费率不超过 100%
        LENS = IERC20(lens); // 设置 LENS 合约
        feeRecipient = feeRecipient_; // 设置费接收人
        feeBps = feeBps_; // 设置费率
    }

    function setFee(uint96 newFeeBps, address newRecipient) external onlyOwner { // 更新费率和费接收人
        require(newFeeBps <= 10_000, "fee too high"); // 限制最大费率
        feeBps = newFeeBps; // 更新费率
        if (newRecipient != address(0)) feeRecipient = newRecipient; // 可选更新费接收人
    }

    // Create a new course with price and metadata URI // 创建课程
    function createCourse(uint256 price, string calldata uri) external returns (uint256 id) { // 新建课程并返回 ID
        require(price > 0, "price=0"); // 价格需大于 0
        id = ++nextCourseId; // 自增课程 ID
        courses[id] = Course({author: msg.sender, price: price, uri: uri, exists: true, active: true}); // 存储课程信息
        emit CourseCreated(id, msg.sender, price, uri); // 触发创建事件
    }

    // Purchase a course; splits payment between author and platform // 购买课程并分账
    function buy(uint256 courseId) external nonReentrant { // 购买指定课程
        Course memory c = courses[courseId]; // 读取课程
        require(c.exists, "not found"); // 确保课程存在
        require(c.active, "inactive"); // 确保课程是激活状态
        require(!purchased[courseId][msg.sender], "already"); // 防止重复购买

        purchased[courseId][msg.sender] = true; // 标记已购买

        uint256 fee = (c.price * feeBps) / 10_000; // 计算平台费
        uint256 authorAmount = c.price - fee; // 作者实收

        require(LENS.transferFrom(msg.sender, c.author, authorAmount), "pay author fail"); // 支付作者
        if (fee > 0) { // 若有平台费
            require(LENS.transferFrom(msg.sender, feeRecipient, fee), "pay fee fail"); // 支付平台费
        }
        emit Purchased(courseId, msg.sender, c.price, fee, authorAmount); // 触发购买事件
    }

    // Check whether a user has purchased a course // 查询是否已购
    function hasAccess(uint256 courseId, address user) external view returns (bool) { // 查看用户课程访问权限
        return purchased[courseId][user]; // 返回购买标记
    }

    // 编辑课程（仅作者可编辑）
    function updateCourse(uint256 courseId, uint256 newPrice, string calldata newUri) external { // 更新课程
        Course storage c = courses[courseId]; // 读取课程存储
        require(c.exists, "not found"); // 确保课程存在
        require(c.author == msg.sender, "not author"); // 只有作者可编辑
        require(newPrice > 0, "price=0"); // 价格需大于 0
        
        c.price = newPrice; // 更新价格
        c.uri = newUri; // 更新元数据
        emit CourseUpdated(courseId, newPrice, newUri); // 触发更新事件
    }

    // 停用课程（仅作者可停用）
    function deactivateCourse(uint256 courseId) external { // 停用课程
        Course storage c = courses[courseId]; // 读取课程存储
        require(c.exists, "not found"); // 确保课程存在
        require(c.author == msg.sender, "not author"); // 只有作者可停用
        
        c.active = false; // 标记为非活跃
        emit CourseDeactivated(courseId); // 触发停用事件
    }

    // 查询指定作者的所有激活课程（高效查询，一次调用返回完整数据）
    function getAuthorCourses(address author) external view returns (CourseInfo[] memory) {
        // 第一次遍历：计算激活课程数量
        uint256 count = 0;
        for (uint256 i = 1; i <= nextCourseId; i++) {
            Course storage c = courses[i];
            if (c.exists && c.active && c.author == author) {
                count++;
            }
        }
        
        // 第二次遍历：填充课程信息数组
        CourseInfo[] memory result = new CourseInfo[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= nextCourseId; i++) {
            Course storage c = courses[i];
            if (c.exists && c.active && c.author == author) {
                result[index] = CourseInfo({
                    id: i,
                    author: c.author,
                    price: c.price,
                    uri: c.uri
                });
                index++;
            }
        }
        
        return result;
    }

    // 获取所有激活的课程列表
    function getAllCourses() external view returns (CourseInfo[] memory) {
        // 第一次遍历：计算激活课程数量
        uint256 count = 0;
        for (uint256 i = 1; i <= nextCourseId; i++) {
            Course storage c = courses[i];
            if (c.exists && c.active) {
                count++;
            }
        }
        
        // 第二次遍历：填充课程信息数组
        CourseInfo[] memory result = new CourseInfo[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= nextCourseId; i++) {
            Course storage c = courses[i];
            if (c.exists && c.active) {
                result[index] = CourseInfo({
                    id: i,
                    author: c.author,
                    price: c.price,
                    uri: c.uri
                });
                index++;
            }
        }
        
        return result;
    }
}
