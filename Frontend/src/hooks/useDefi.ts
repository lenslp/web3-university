import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther } from 'viem';

const ROUTER_ABI = [
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'useAave', type: 'bool' },
    ],
    name: 'swapLensToUSDTAndDeposit',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getATokenBalance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const LENS_TOKEN_ABI = [
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export function useDefi() {
  const routerAddress = process.env.NEXT_PUBLIC_ROUTER_ADDRESS as `0x${string}`;
  const lensTokenAddress = process.env.NEXT_PUBLIC_LENS_TOKEN_ADDRESS as `0x${string}`;

  const { writeContract: writeRouterContract, data: swapHash } = useWriteContract();
  const { writeContract: writeLensContract, data: approveHash } = useWriteContract();

  const { isLoading: isSwapLoading, isSuccess: isSwapSuccess } = useWaitForTransactionReceipt({
    hash: swapHash,
  });

  const { isLoading: isApproveLoading, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // 授权 Router 使用 LENS
  const approveRouter = async (amount: string) => {
    if (!lensTokenAddress || !routerAddress) {
      throw new Error('Contract addresses not configured');
    }
    
    writeLensContract({
      address: lensTokenAddress,
      abi: LENS_TOKEN_ABI,
      functionName: 'approve',
      args: [routerAddress, parseEther(amount)],
    });
  };

  // Swap 并存入 Aave
  const swapAndDeposit = async (amountIn: string, useAave: boolean = true) => {
    if (!routerAddress) {
      throw new Error('Router address not configured');
    }

    const amountInWei = parseEther(amountIn);
    const minOut = amountInWei * BigInt(95) / BigInt(100); // 5% 滑点保护

    writeRouterContract({
      address: routerAddress,
      abi: ROUTER_ABI,
      functionName: 'swapLensToUSDTAndDeposit',
      args: [amountInWei, minOut, useAave],
    });
  };

  // 获取 aToken 余额
  const useATokenBalance = (userAddress: `0x${string}` | undefined) => {
    return useReadContract({
      address: routerAddress,
      abi: ROUTER_ABI,
      functionName: 'getATokenBalance',
      args: userAddress ? [userAddress] : undefined,
      query: {
        enabled: !!userAddress && !!routerAddress,
      },
    });
  };

  return {
    approveRouter,
    swapAndDeposit,
    useATokenBalance,
    isSwapLoading,
    isSwapSuccess,
    isApproveLoading,
    isApproveSuccess,
  };
}
