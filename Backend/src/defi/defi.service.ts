import { Injectable } from '@nestjs/common';

const API_BASE = 'https://api.1inch.io/v6.0';

@Injectable()
export class DefiService {
  async get1InchSwapData(params: {
    chainId: number;
    fromTokenAddress: string;
    toTokenAddress: string;
    amountWei: string; // amount in wei
    fromAddress: string; // Router contract address (caller)
    receiver: string; // Router contract address (receiver)
    slippage: number; // percent
  }) {
    const search = new URLSearchParams({
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amountWei,
      fromAddress: params.fromAddress,
      slippage: String(params.slippage),
      disableEstimate: 'true',
      // ensure outputs are sent to Router
      destReceiver: params.receiver,
    });

    const url = `${API_BASE}/${params.chainId}/swap?${search.toString()}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`1inch swap fetch failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    // Expected fields: tx.to, tx.data, tx.value, tx.gas, etc.
    // Also include estimated toAmount if available for minOut calculation.
    return {
      to: data?.tx?.to as string,
      data: data?.tx?.data as string,
      value: (data?.tx?.value ?? '0') as string,
      gas: data?.tx?.gas as number | undefined,
      gasPrice: data?.tx?.gasPrice as string | undefined,
      toAmount: (data?.toAmount ?? data?.dstAmount ?? null) as string | null,
    };
  }
}
