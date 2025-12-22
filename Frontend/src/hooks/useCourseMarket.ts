import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useWalletClient } from 'wagmi';
import { parseEther, encodeFunctionData } from 'viem';
import CourseMarketArtifact from '@/contracts/CourseMarket.json';
import LENSArtifact from '@/contracts/LENS.json';

const COURSE_MARKET_ABI = CourseMarketArtifact.abi;
const LENS_TOKEN_ABI = LENSArtifact.abi;

// SimpleAMM ABI (仅需要的函数)
const AMM_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'tokenIn', type: 'address' },
      { internalType: 'address', name: 'tokenOut', type: 'address' },
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
    ],
    name: 'getAmountOut',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenIn', type: 'address' },
      { internalType: 'address', name: 'tokenOut', type: 'address' },
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'minOut', type: 'uint256' },
    ],
    name: 'swapExactInput',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// WETH ABI
const WETH_ABI = [
  {
    inputs: [],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function useCourseMarket() {
  const courseMarketAddress = process.env.NEXT_PUBLIC_COURSE_MARKET_ADDRESS as `0x${string}`;
  const lensTokenAddress = process.env.NEXT_PUBLIC_LENS_TOKEN_ADDRESS as `0x${string}`;
  const ammAddress = process.env.NEXT_PUBLIC_AMM_ADDRESS as `0x${string}`;
  const wethAddress = process.env.NEXT_PUBLIC_WETH_ADDRESS as `0x${string}`;
  const routerAddress = process.env.NEXT_PUBLIC_ROUTER_ADDRESS as `0x${string}`;
  const { data: walletClient } = useWalletClient();

  const { writeContract: writeCourseContract, writeContractAsync: writeCourseContractAsync, data: courseHash } = useWriteContract();
  const { writeContract: writeLensContract, writeContractAsync: writeLensContractAsync, data: approveHash } = useWriteContract();
  const { writeContract: writeAmmContract, writeContractAsync: writeAmmContractAsync, data: swapHash } = useWriteContract();
  const { writeContract: writeUpdateContract, data: updateHash } = useWriteContract();
  const { writeContract: writeDeleteContract, data: deleteHash } = useWriteContract();

  const { isLoading: isSwapLoading, isSuccess: isSwapSuccess } = useWaitForTransactionReceipt({
    hash: swapHash,
  });

  const { isLoading: isCourseLoading, isSuccess: isCourseSuccess } = useWaitForTransactionReceipt({
    hash: courseHash,
  });

  const { isLoading: isApproveLoading, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // 等待编辑交易确认
  const { isLoading: isUpdateLoading, isSuccess: isUpdateSuccess } = useWaitForTransactionReceipt({
    hash: updateHash,
  });

  // 等待删除交易确认
  const { isLoading: isDeleteLoading, isSuccess: isDeleteSuccess } = useWaitForTransactionReceipt({
    hash: deleteHash,
  });

  // 创建课程
  const createCourse = async (price: string, courseData: string) => {
    if (!courseMarketAddress) {
      throw new Error('CourseMarket address not configured');
    }
    return writeCourseContractAsync({
      address: courseMarketAddress,
      abi: COURSE_MARKET_ABI,
      functionName: 'createCourse',
      args: [parseEther(price), courseData],
    });
  };

  // 授权 LENS token
  const approveLens = async (amount: string) => {
    if (!lensTokenAddress || !courseMarketAddress) {
      throw new Error('Contract addresses not configured');
    }

    return writeLensContractAsync({
      address: lensTokenAddress,
      abi: LENS_TOKEN_ABI,
      functionName: 'approve',
      args: [courseMarketAddress, parseEther(amount)],
    });
  };

  // 使用 ETH 交换 LENS（单步，通过 Router）
  const swapEthForLens = async (ethAmount: string, minLensOut: string) => {
    if (!routerAddress) {
      throw new Error('Router address not configured');
    }
    return writeAmmContractAsync({
      address: routerAddress,
      abi: [
        {
          inputs: [{ internalType: 'uint256', name: 'minOut', type: 'uint256' }],
          name: 'swapEthForLens',
          outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
          stateMutability: 'payable',
          type: 'function',
        },
      ] as const,
      functionName: 'swapEthForLens',
      args: [parseEther(minLensOut)],
      value: parseEther(ethAmount),
    });
  };

  // 购买课程
  const buyCourse = async (courseId: bigint) => {
    if (!courseMarketAddress) {
      throw new Error('CourseMarket address not configured');
    }

    return writeCourseContractAsync({
      address: courseMarketAddress,
      abi: COURSE_MARKET_ABI,
      functionName: 'buy',
      args: [courseId],
    });
  };

  // 编辑课程
  const updateCourse = async (courseId: bigint, newPrice: string, newUri: string) => {
    if (!courseMarketAddress) {
      throw new Error('CourseMarket address not configured');
    }

    writeUpdateContract({
      address: courseMarketAddress,
      abi: COURSE_MARKET_ABI,
      functionName: 'updateCourse',
      args: [courseId, parseEther(newPrice), newUri],
    });
  };

  // 删除课程（停用）
  const deactivateCourse = async (courseId: bigint) => {
    if (!courseMarketAddress) {
      throw new Error('CourseMarket address not configured');
    }

    writeDeleteContract({
      address: courseMarketAddress,
      abi: COURSE_MARKET_ABI,
      functionName: 'deactivateCourse',
      args: [courseId],
    });
  };

  // Fallback: 直接构造交易data并发送，绕过模拟（仅在调试失败时使用）
  const updateCourseRaw = async (courseId: bigint, newPrice: string, newUri: string) => {
    if (!courseMarketAddress) throw new Error('CourseMarket address not configured');
    if (!walletClient) throw new Error('Wallet client not available');

    const data = encodeFunctionData({
      abi: COURSE_MARKET_ABI,
      functionName: 'updateCourse',
      args: [courseId, parseEther(newPrice), newUri],
    });

    return walletClient.sendTransaction({ to: courseMarketAddress, data });
  };

  const deactivateCourseRaw = async (courseId: bigint) => {
    if (!courseMarketAddress) throw new Error('CourseMarket address not configured');
    if (!walletClient) throw new Error('Wallet client not available');

    const data = encodeFunctionData({
      abi: COURSE_MARKET_ABI,
      functionName: 'deactivateCourse',
      args: [courseId],
    });

    return walletClient.sendTransaction({ to: courseMarketAddress, data });
  };

  // 检查是否有访问权限
  const useHasAccess = (userAddress: `0x${string}` | undefined, courseId: number) => {
    return useReadContract({
      address: courseMarketAddress,
      abi: COURSE_MARKET_ABI,
      functionName: 'hasAccess',
      args: userAddress ? [userAddress, BigInt(courseId)] : undefined,
      query: {
        enabled: !!userAddress && !!courseMarketAddress,
      },
    });
  };

  // 获取课程信息
  const useGetCourse = (courseId: number) => {
    return useReadContract({
      address: courseMarketAddress,
      abi: COURSE_MARKET_ABI,
      functionName: 'courses',
      args: [BigInt(courseId)],
      query: {
        enabled: !!courseMarketAddress,
      },
    });
  };

  // 获取下一个课程 ID
  const useNextCourseId = () => {
    return useReadContract({
      address: courseMarketAddress,
      abi: COURSE_MARKET_ABI,
      functionName: 'nextCourseId',
      query: {
        enabled: !!courseMarketAddress,
      },
    });
  };

  // 获取 LENS 余额
  const useLensBalance = (userAddress: `0x${string}` | undefined) => {
    return useReadContract({
      address: lensTokenAddress,
      abi: LENS_TOKEN_ABI,
      functionName: 'balanceOf',
      args: userAddress ? [userAddress] : undefined,
      query: {
        enabled: !!userAddress && !!lensTokenAddress,
      },
    });
  };

  return {
    createCourse,
    approveLens,
    buyCourse,
    swapEthForLens,
    updateCourse,
    deactivateCourse,
    updateCourseRaw,
    deactivateCourseRaw,
    useHasAccess,
    useGetCourse,
    useNextCourseId,
    useLensBalance,
    isCourseLoading,
    isCourseSuccess,
    isApproveLoading,
    isApproveSuccess,
    isSwapLoading,
    isSwapSuccess,
    isUpdateLoading,
    isUpdateSuccess,
    isDeleteLoading,
    isDeleteSuccess,
    courseMarketAddress,
    lensTokenAddress,
    ammAddress,
    wethAddress,
    COURSE_MARKET_ABI,
    LENS_TOKEN_ABI,
    AMM_ABI,
    WETH_ABI,
    routerAddress,
  };
}
