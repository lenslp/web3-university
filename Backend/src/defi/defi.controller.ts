import { Controller, Get, Query } from '@nestjs/common';
import { DefiService } from './defi.service';

@Controller('defi')
export class DefiController {
  constructor(private readonly svc: DefiService) {}

  @Get('1inch/swap-data')
  async getSwapData(
    @Query('chainId') chainId: string,
    @Query('fromTokenAddress') fromTokenAddress: string,
    @Query('toTokenAddress') toTokenAddress: string,
    @Query('amountWei') amountWei: string,
    @Query('fromAddress') fromAddress: string,
    @Query('receiver') receiver: string,
    @Query('slippage') slippage: string,
  ) {
    const data = await this.svc.get1InchSwapData({
      chainId: Number(chainId || 1),
      fromTokenAddress,
      toTokenAddress,
      amountWei,
      fromAddress,
      receiver,
      slippage: Number(slippage || 1),
    });
    return data;
  }
}
