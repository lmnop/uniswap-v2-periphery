import chai, { expect } from 'chai'
import { Wallet, Contract } from 'ethers'
import { AddressZero, Zero, MaxUint256 } from 'ethers/constants'
import { BigNumber, bigNumberify, formatEther } from 'ethers/utils'
import { solidity, MockProvider, createFixtureLoader } from 'ethereum-waffle'
import { ecsign } from 'ethereumjs-util'

import { expandTo18Decimals, getApprovalDigest, mineBlock, MINIMUM_LIQUIDITY } from './shared/utilities'
import { v2Fixture } from './shared/fixtures'

chai.use(solidity)

const overrides = {
  gasLimit: 9999999
}

function expandTo16Decimals(n: number): BigNumber {
  return bigNumberify(n).mul(bigNumberify(10).pow(16))
}

describe('UniswapV3Router01', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const wallets = provider.getWallets()
  const loadFixture = createFixtureLoader(provider, wallets)

  let token0: Contract
  let token1: Contract
  let WETH: Contract
  let factory: Contract
  let router: Contract
  let pairAB: Contract
  let WETHAPair: Contract
  let WETHBPair: Contract
  let routerEventEmitter: Contract

  
  beforeEach(async function() {
    const fixture = await loadFixture(v2Fixture)
    token0 = fixture.token0
    token1 = fixture.token1
    WETH = fixture.WETH
    factory = fixture.factoryV2
    router = fixture.router03
    pairAB = fixture.pairAB
    WETHAPair = fixture.WETHAPair
    WETHBPair = fixture.WETHBPair
    routerEventEmitter = fixture.routerEventEmitter
  })

  // afterEach(async function() {
  //   expect(await provider.getBalance(router.address)).to.eq(Zero)
  // })

  describe('UniswapV3Router01', () => {

    async function enableWhitelist(wallets: Wallet[]) {
      const addresses = wallets.map(({address})=>address)
      await router.enableWhitelist(
        addresses,
        overrides
      )
    }
    
    it('factory, WETH', async () => {
      expect(await router.factory()).to.eq(factory.address)
      expect(await router.WETH()).to.eq(WETH.address)
    })

    // it('addLiquidity', async () => {

    //   for (let i = 0; i++; i < wallets.length) {

    //     const wallet = wallets[i]

    //     const token0Amount = expandTo18Decimals(1)
    //     const token1Amount = expandTo18Decimals(4)

    //     const expectedLiquidity = expandTo18Decimals(2)
    //     await token0.approve(router.address, MaxUint256)
    //     await token1.approve(router.address, MaxUint256)
    //     await expect(
    //       router.addLiquidity(
    //         token0.address,
    //         token1.address,
    //         token0Amount,
    //         token1Amount,
    //         0,
    //         0,
    //         wallet.address,
    //         MaxUint256,
    //         overrides
    //       )
    //     )
    //       .to.emit(token0, 'Transfer')
    //       .withArgs(wallet.address, pairAB.address, token0Amount)
    //       .to.emit(token1, 'Transfer')
    //       .withArgs(wallet.address, pairAB.address, token1Amount)
    //       .to.emit(pairAB, 'Transfer')
    //       .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
    //       .to.emit(pairAB, 'Transfer')
    //       .withArgs(AddressZero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
    //       .to.emit(pairAB, 'Sync')
    //       .withArgs(token0Amount, token1Amount)
    //       .to.emit(pairAB, 'Mint')
    //       .withArgs(router.address, token0Amount, token1Amount)

    //     expect(await pairAB.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
    //   }
    // })

    // it('addLiquidityETH', async () => {

    //   for (let i = 0; i++; i < wallets.length) {

    //     const wallet = wallets[i]
    //     const token0Amount = expandTo18Decimals(1)
    //     const ETHAmount = expandTo18Decimals(4)
    //     const expectedLiquidity = expandTo18Decimals(2)

    //     const token0w = token0.connect(wallet);
    //     const routerw = router.connect(wallet);

    //     const WETHAPairToken0 = await WETHAPair.token0()
    //     await token0w.approve(router.address, MaxUint256)
    //     await expect(
    //       routerw.addLiquidityETH(
    //         token0.address,
    //         token0Amount,
    //         token0Amount,
    //         ETHAmount,
    //         wallet.address,
    //         MaxUint256,
    //         { ...overrides, value: ETHAmount }
    //       )
    //     )
    //       .to.emit(WETHAPair, 'Transfer')
    //       .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
    //       .to.emit(WETHAPair, 'Transfer')
    //       .withArgs(AddressZero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
    //       .to.emit(WETHAPair, 'Sync')
    //       .withArgs(
    //         WETHAPairToken0 === token0.address ? token0Amount : ETHAmount,
    //         WETHAPairToken0 === token0.address ? ETHAmount : token0Amount
    //       )
    //       .to.emit(WETHAPair, 'Mint')
    //       .withArgs(
    //         router.address,
    //         WETHAPairToken0 === token0.address ? token0Amount : ETHAmount,
    //         WETHAPairToken0 === token0.address ? ETHAmount : token0Amount
    //       )

    //     expect(await WETHAPair.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
    //   }
    // })

    // async function addLiquidity(token0Amount: BigNumber, token1Amount: BigNumber, wallet: Wallet, pair: Contract) {
    //   let tx;
    //   tx = await token0.transfer(pair.address, token0Amount)
    //   await tx.wait();
    //   tx = await token1.transfer(pair.address, token1Amount)
    //   await tx.wait();
    //   tx = await pair.mint(wallet.address, overrides)
    //   await tx.wait();
    // }

    // it('removeLiquidity', async () => {

    //   for (let i = 0; i++; i < wallets.length) {

    //     const wallet = wallets[i]
    //     const token0Amount = expandTo18Decimals(1)
    //     const token1Amount = expandTo18Decimals(4)

    //     const pair = pairAB.connect(wallet);
    //     const routerw = router.connect(wallet);

    //     let tx = await pairAB.approve(routerw.address, MaxUint256)
    //     await tx.wait();
    //     await addLiquidity(token0Amount, token1Amount, wallet, pair)

    //     const expectedLiquidity = expandTo18Decimals(2)
        
    //     await expect(
    //       routerw.removeLiquidity(
    //         token0.address,
    //         token1.address,
    //         expectedLiquidity.sub(MINIMUM_LIQUIDITY),
    //         0,
    //         0,
    //         wallet.address,
    //         MaxUint256,
    //         overrides
    //       )
    //     )
    //       .to.emit(pair, 'Transfer')
    //       .withArgs(wallet.address, pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
    //       .to.emit(pair, 'Transfer')
    //       .withArgs(pair.address, AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
    //       .to.emit(token0, 'Transfer')
    //       .withArgs(pair.address, wallet.address, token0Amount.sub(500))
    //       .to.emit(token1, 'Transfer')
    //       .withArgs(pair.address, wallet.address, token1Amount.sub(2000))
    //       .to.emit(pair, 'Sync')
    //       .withArgs(500, 2000)
    //       .to.emit(pair, 'Burn')
    //       .withArgs(routerw.address, token0Amount.sub(500), token1Amount.sub(2000), wallet.address)

    //     expect(await pair.balanceOf(wallet.address)).to.eq(0)
    //     const totalSupplyToken0 = await token0.totalSupply()
    //     const totalSupplyToken1 = await token1.totalSupply()
    //     expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0.sub(500))
    //     expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1.sub(2000))
    //   }
    // })

    // it('removeLiquidityETH', async () => {

    //   for (let i = 0; i++; i < wallets.length) {

    //     const wallet = wallets[i]
    //     const token0Amount = expandTo18Decimals(1)
    //     const ETHAmount = expandTo18Decimals(4)

    //     const WETHAPairw = WETHAPair.connect(wallet);
    //     const routerw = router.connect(wallet);

    //     await token0.transfer(WETHAPair.address, token0Amount)
    //     await WETH.deposit({ value: ETHAmount })
    //     await WETH.transfer(WETHAPair.address, ETHAmount)
    //     await WETHAPairw.mint(wallet.address, overrides)

    //     const expectedLiquidity = expandTo18Decimals(2)
    //     const WETHAPairToken0 = await WETHAPair.token0()
    //     await WETHAPairw.approve(router.address, MaxUint256)
    //     await expect(
    //       routerw.removeLiquidityETH(
    //         token0.address,
    //         expectedLiquidity.sub(MINIMUM_LIQUIDITY),
    //         0,
    //         0,
    //         wallet.address,
    //         MaxUint256,
    //         overrides
    //       )
    //     )
    //       .to.emit(WETHAPair, 'Transfer')
    //       .withArgs(wallet.address, WETHAPair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
    //       .to.emit(WETHAPair, 'Transfer')
    //       .withArgs(WETHAPair.address, AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
    //       .to.emit(WETH, 'Transfer')
    //       .withArgs(WETHAPair.address, router.address, ETHAmount.sub(2000))
    //       .to.emit(token0, 'Transfer')
    //       .withArgs(WETHAPair.address, router.address, token0Amount.sub(500))
    //       .to.emit(token0, 'Transfer')
    //       .withArgs(router.address, wallet.address, token0Amount.sub(500))
    //       .to.emit(WETHAPair, 'Sync')
    //       .withArgs(
    //       WETHAPairToken0 === token0.address ? 500 : 2000,
    //         WETHAPairToken0 === token0.address ? 2000 : 500
    //       )
    //       .to.emit(WETHAPair, 'Burn')
    //       .withArgs(
    //         router.address,
    //         WETHAPairToken0 === token0.address ? token0Amount.sub(500) : ETHAmount.sub(2000),
    //         WETHAPairToken0 === token0.address ? ETHAmount.sub(2000) : token0Amount.sub(500),
    //         router.address
    //       )

    //     expect(await WETHAPair.balanceOf(wallet.address)).to.eq(0)
    //     const totalSupplytoken0 = await token0.totalSupply()
    //     const totalSupplyWETH = await WETH.totalSupply()
    //     expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplytoken0.sub(500))
    //     expect(await WETH.balanceOf(wallet.address)).to.eq(totalSupplyWETH.sub(2000))
    //   }
    // })

    // describe('swapExactTokensForTokens', () => {
    //   const token0Amount = expandTo18Decimals(5)
    //   const token1Amount = expandTo18Decimals(10)
    //   const swapAmount = expandTo18Decimals(1)
    //   const expectedOutputAmount = bigNumberify('1662497915624478906')

    //   beforeEach(async () => {
    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       await addLiquidity(token0Amount, token1Amount, wallet, pairAB)
    //     }
    //     await token0.approve(router.address, MaxUint256)
    //   })

    //   it('happy path', async () => {
    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       const routerw = router.connect(wallet);

    //       await expect(
    //         routerw.swapExactTokensForTokens(
    //           swapAmount,
    //           0,
    //           [token0.address, token1.address],
    //           wallet.address,
    //           MaxUint256,
    //           overrides
    //         )
    //       )
    //         .to.emit(token0, 'Transfer')
    //         .withArgs(wallet.address, pairAB.address, swapAmount)
    //         .to.emit(token1, 'Transfer')
    //         .withArgs(pairAB.address, wallet.address, expectedOutputAmount)
    //         .to.emit(pairAB, 'Sync')
    //         .withArgs(token0Amount.add(swapAmount), token1Amount.sub(expectedOutputAmount))
    //         .to.emit(pairAB, 'Swap')
    //         .withArgs(router.address, swapAmount, 0, 0, expectedOutputAmount, wallet.address)
    //     }
    //   })

    //   it('amounts', async () => {
    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       const routerEventEmitterw = routerEventEmitter.connect(wallet);

    //       await token0.approve(routerEventEmitter.address, MaxUint256)
    //       await expect(
    //         routerEventEmitterw.swapExactTokensForTokens(
    //           router.address,
    //           swapAmount,
    //           0,
    //           [token0.address, token1.address],
    //           wallet.address,
    //           MaxUint256,
    //           overrides
    //         )
    //       )
    //         .to.emit(routerEventEmitter, 'Amounts')
    //         .withArgs([swapAmount, expectedOutputAmount])
    //     }
    //   })

    //   it('gas', async () => {
    //     // ensure that setting price{0,1}CumulativeLast for the first time doesn't affect our gas math
    //     await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
    //     await pairAB.sync(overrides)

    //     await token0.approve(router.address, MaxUint256)
    //     await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)

    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       const routerw = router.connect(wallet);

    //       const tx = await routerw.swapExactTokensForTokens(
    //         swapAmount,
    //         0,
    //         [token0.address, token1.address],
    //         wallet.address,
    //         MaxUint256,
    //         overrides
    //       )
    //       const receipt = await tx.wait()
    //       expect(receipt.gasUsed).to.eq(101898)
    //     }
    //   }).retries(3)
    // })

    // describe('swapTokensForExactTokens', () => {
    //   const token0Amount = expandTo18Decimals(5)
    //   const token1Amount = expandTo18Decimals(10)
    //   const expectedSwapAmount = bigNumberify('557227237267357629')
    //   const outputAmount = expandTo18Decimals(1)

    //   beforeEach(async () => {
    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       await addLiquidity(token0Amount, token1Amount, wallet, pairAB)
    //     }
    //   })

    //   it('happy path', async () => {
    //     await token0.approve(router.address, MaxUint256)

    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       const routerw = router.connect(wallet);

    //       await expect(
    //         routerw.swapTokensForExactTokens(
    //           outputAmount,
    //           MaxUint256,
    //           [token0.address, token1.address],
    //           wallet.address,
    //           MaxUint256,
    //           overrides
    //         )
    //       )
    //         .to.emit(token0, 'Transfer')
    //         .withArgs(wallet.address, pairAB.address, expectedSwapAmount)
    //         .to.emit(token1, 'Transfer')
    //         .withArgs(pairAB.address, wallet.address, outputAmount)
    //         .to.emit(pairAB, 'Sync')
    //         .withArgs(token0Amount.add(expectedSwapAmount), token1Amount.sub(outputAmount))
    //         .to.emit(pairAB, 'Swap')
    //         .withArgs(router.address, expectedSwapAmount, 0, 0, outputAmount, wallet.address)
    //     }
    //   })

    //   it('amounts', async () => {
    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       const routerEventEmitterw = routerEventEmitter.connect(wallet);

    //       await token0.approve(routerEventEmitter.address, MaxUint256)
    //       await expect(
    //         routerEventEmitterw.swapTokensForExactTokens(
    //           router.address,
    //           outputAmount,
    //           MaxUint256,
    //           [token0.address, token1.address],
    //           wallet.address,
    //           MaxUint256,
    //           overrides
    //         )
    //       )
    //         .to.emit(routerEventEmitter, 'Amounts')
    //         .withArgs([expectedSwapAmount, outputAmount])
    //     }
    //   })
    // })

    // describe('swapExactETHForTokens', () => {
    //   const token0Amount = expandTo18Decimals(10)
    //   const ETHAmount = expandTo18Decimals(5)
    //   const swapAmount = expandTo18Decimals(1)
    //   const expectedOutputAmount = bigNumberify('1662497915624478906')

    //   beforeEach(async () => {
    //     await token0.transfer(WETHAPair.address, token0Amount)
    //     await WETH.deposit({ value: ETHAmount })
    //     await WETH.transfer(WETHAPair.address, ETHAmount)

    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       await WETHAPair.mint(wallet.address, overrides)
    //     }

    //     await token0.approve(router.address, MaxUint256)
    //   })

    //   it('happy path', async () => {
    //     const WETHAPairToken0 = await WETHAPair.token0()

    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       const routerw = router.connect(wallet);

    //       await expect(
    //         routerw.swapExactETHForTokens(0, [WETH.address, token0.address], wallet.address, MaxUint256, {
    //           ...overrides,
    //           value: swapAmount
    //         })
    //       )
    //         .to.emit(WETH, 'Transfer')
    //         .withArgs(router.address, WETHAPair.address, swapAmount)
    //         .to.emit(token0, 'Transfer')
    //         .withArgs(WETHAPair.address, wallet.address, expectedOutputAmount)
    //         .to.emit(WETHAPair, 'Sync')
    //         .withArgs(
    //           WETHAPairToken0 === token0.address
    //             ? token0Amount.sub(expectedOutputAmount)
    //             : ETHAmount.add(swapAmount),
    //           WETHAPairToken0 === token0.address
    //             ? ETHAmount.add(swapAmount)
    //             : token0Amount.sub(expectedOutputAmount)
    //         )
    //         .to.emit(WETHAPair, 'Swap')
    //         .withArgs(
    //           router.address,
    //           WETHAPairToken0 === token0.address ? 0 : swapAmount,
    //           WETHAPairToken0 === token0.address ? swapAmount : 0,
    //           WETHAPairToken0 === token0.address ? expectedOutputAmount : 0,
    //           WETHAPairToken0 === token0.address ? 0 : expectedOutputAmount,
    //           wallet.address
    //         )
    //     }
    //   })

    //   it('amounts', async () => {
    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       const routerEventEmitterw = routerEventEmitter.connect(wallet);

    //       await expect(
    //         routerEventEmitterw.swapExactETHForTokens(
    //           router.address,
    //           0,
    //           [WETH.address, token0.address],
    //           wallet.address,
    //           MaxUint256,
    //           {
    //             ...overrides,
    //             value: swapAmount
    //           }
    //         )
    //       )
    //         .to.emit(routerEventEmitter, 'Amounts')
    //         .withArgs([swapAmount, expectedOutputAmount])
    //     }
    //   })

    //   it('gas', async () => {
    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       const routerw = router.connect(wallet);

    //       const token0Amount = expandTo18Decimals(10)
    //       const ETHAmount = expandTo18Decimals(5)
    //       await token0.transfer(WETHAPair.address, token0Amount)
    //       await WETH.deposit({ value: ETHAmount })
    //       await WETH.transfer(WETHAPair.address, ETHAmount)
    //       await WETHAPair.mint(wallet.address, overrides)

    //       // ensure that setting price{0,1}CumulativeLast for the first time doesn't affect our gas math
    //       await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
    //       await pairAB.sync(overrides)

    //       const swapAmount = expandTo18Decimals(1)
    //       await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
    //       const tx = await routerw.swapExactETHForTokens(
    //         0,
    //         [WETH.address, token0.address],
    //         wallet.address,
    //         MaxUint256,
    //         {
    //           ...overrides,
    //           value: swapAmount
    //         }
    //       )
    //       const receipt = await tx.wait()
    //       expect(receipt.gasUsed).to.eq(138770)
    //     }
    //   }).retries(3)
    // })

    // describe('swapExactTokensForETH', () => {
    //   const token0Amount = expandTo18Decimals(5)
    //   const ETHAmount = expandTo18Decimals(10)
    //   const swapAmount = expandTo18Decimals(1)
    //   const expectedOutputAmount = bigNumberify('1662497915624478906')

    //   beforeEach(async () => {
    //     await token0.transfer(WETHAPair.address, token0Amount)
    //     await WETH.deposit({ value: ETHAmount })
    //     await WETH.transfer(WETHAPair.address, ETHAmount)

    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       await WETHAPair.mint(wallet.address, overrides)
    //     }
    //   })

    //   it('happy path', async () => {
    //     await token0.approve(router.address, MaxUint256)
    //     const WETHAPairToken0 = await WETHAPair.token0()

    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       const routerw = router.connect(wallet);

    //       await expect(
    //         routerw.swapExactTokensForETH(
    //           swapAmount,
    //           0,
    //           [token0.address, WETH.address],
    //           wallet.address,
    //           MaxUint256,
    //           overrides
    //         )
    //       )
    //         .to.emit(token0, 'Transfer')
    //         .withArgs(wallet.address, WETHAPair.address, swapAmount)
    //         .to.emit(WETH, 'Transfer')
    //         .withArgs(WETHAPair.address, router.address, expectedOutputAmount)
    //         .to.emit(WETHAPair, 'Sync')
    //         .withArgs(
    //           WETHAPairToken0 === token0.address
    //             ? token0Amount.add(swapAmount)
    //             : ETHAmount.sub(expectedOutputAmount),
    //           WETHAPairToken0 === token0.address
    //             ? ETHAmount.sub(expectedOutputAmount)
    //             : token0Amount.add(swapAmount)
    //         )
    //         .to.emit(WETHAPair, 'Swap')
    //         .withArgs(
    //           router.address,
    //           WETHAPairToken0 === token0.address ? swapAmount : 0,
    //           WETHAPairToken0 === token0.address ? 0 : swapAmount,
    //           WETHAPairToken0 === token0.address ? 0 : expectedOutputAmount,
    //           WETHAPairToken0 === token0.address ? expectedOutputAmount : 0,
    //           router.address
    //         )
    //     }
    //   })

    //   it('amounts', async () => {
    //     await token0.approve(routerEventEmitter.address, MaxUint256)

    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       const routerEventEmitterw = routerEventEmitter.connect(wallet);

    //       await expect(
    //         routerEventEmitterw.swapExactTokensForETH(
    //           router.address,
    //           swapAmount,
    //           0,
    //           [token0.address, WETH.address],
    //           wallet.address,
    //           MaxUint256,
    //           overrides
    //         )
    //       )
    //         .to.emit(routerEventEmitter, 'Amounts')
    //         .withArgs([swapAmount, expectedOutputAmount])
    //     }
    //   })
    // })

    // describe('swapETHForExactTokens', () => {
    //   const token0Amount = expandTo18Decimals(10)
    //   const ETHAmount = expandTo18Decimals(5)
    //   const expectedSwapAmount = bigNumberify('557227237267357629')
    //   const outputAmount = expandTo18Decimals(1)

    //   beforeEach(async () => {
    //     await token0.transfer(WETHAPair.address, token0Amount)
    //     await WETH.deposit({ value: ETHAmount })
    //     await WETH.transfer(WETHAPair.address, ETHAmount)

    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       await WETHAPair.mint(wallet.address, overrides)
    //     }
    //   })

    //   it('happy path', async () => {
    //     const WETHAPairToken0 = await WETHAPair.token0()

    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       const routerw = router.connect(wallet);

    //       await expect(
    //         routerw.swapETHForExactTokens(
    //           outputAmount,
    //           [WETH.address, token0.address],
    //           wallet.address,
    //           MaxUint256,
    //           {
    //             ...overrides,
    //             value: expectedSwapAmount
    //           }
    //         )
    //       )
    //         .to.emit(WETH, 'Transfer')
    //         .withArgs(router.address, WETHAPair.address, expectedSwapAmount)
    //         .to.emit(token0, 'Transfer')
    //         .withArgs(WETHAPair.address, wallet.address, outputAmount)
    //         .to.emit(WETHAPair, 'Sync')
    //         .withArgs(
    //           WETHAPairToken0 === token0.address
    //             ? token0Amount.sub(outputAmount)
    //             : ETHAmount.add(expectedSwapAmount),
    //           WETHAPairToken0 === token0.address
    //             ? ETHAmount.add(expectedSwapAmount)
    //             : token0Amount.sub(outputAmount)
    //         )
    //         .to.emit(WETHAPair, 'Swap')
    //         .withArgs(
    //           router.address,
    //           WETHAPairToken0 === token0.address ? 0 : expectedSwapAmount,
    //           WETHAPairToken0 === token0.address ? expectedSwapAmount : 0,
    //           WETHAPairToken0 === token0.address ? outputAmount : 0,
    //           WETHAPairToken0 === token0.address ? 0 : outputAmount,
    //           wallet.address
    //         )
    //     }
    //   })

    //   it('amounts', async () => {

    //     for (let i = 0; i++; i < wallets.length) {
    //       const wallet = wallets[i]
    //       const routerEventEmitterw = routerEventEmitter.connect(wallet);

    //       await expect(
    //         routerEventEmitterw.swapETHForExactTokens(
    //           router.address,
    //           outputAmount,
    //           [WETH.address, token0.address],
    //           wallet.address,
    //           MaxUint256,
    //           {
    //             ...overrides,
    //             value: expectedSwapAmount
    //           }
    //         )
    //       )
    //         .to.emit(routerEventEmitter, 'Amounts')
    //         .withArgs([expectedSwapAmount, outputAmount])
    //     }
    //   })
    // })

    describe('swapETHForETH', () => {
      const Token0ETHAmount = expandTo18Decimals(500)
      const ETHToken0Amount = expandTo18Decimals(500)

      const Token1Token0Amount = expandTo18Decimals(250)
      const Token0Token1Amount = expandTo18Decimals(250)

      const Token1ETHAmount = expandTo18Decimals(250)
      const ETHToken1Amount = expandTo18Decimals(250)

      const NegligibleAmount = expandTo16Decimals(200)

      const ETHTotalAmount = expandTo18Decimals(750)

      const minProfit = 1.02;
      const amountIn = 1000;
      const minAmountOut = amountIn * minProfit;
      const swapAmountIn = expandTo16Decimals(amountIn)
      const swapMinAmountOut = expandTo16Decimals(minAmountOut)
      

      beforeEach('mint tokens, seed addresses with tokens and WETH, approve all addresses for token contracts', async () => {
        let tx;
        
        tx = await WETH.deposit({ value: ETHTotalAmount })
        await tx.wait()

        tx = await WETH.transfer(WETHAPair.address, Token0ETHAmount)
        await tx.wait()
        tx = await token0.transfer(WETHAPair.address, ETHToken0Amount)
        await tx.wait()

        tx = await token0.transfer(pairAB.address, Token1Token0Amount)
        await tx.wait();
        tx = await token1.transfer(pairAB.address, Token0Token1Amount)
        await tx.wait();

        tx = await token1.transfer(WETHBPair.address, ETHToken1Amount)
        await tx.wait();
        tx = await WETH.transfer(WETHBPair.address, Token1ETHAmount)
        await tx.wait()

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]

          const WETHAPairw = WETHAPair.connect(wallet);
          tx = await WETHAPairw.approve(router.address, MaxUint256)
          await tx.wait();
          const token0w = token0.connect(wallet);
          tx = await token0w.approve(router.address, MaxUint256)
          await tx.wait();
          const token1w = token1.connect(wallet);
          tx = await token1w.approve(router.address, MaxUint256)
          await tx.wait();
          const WETHBPairw = WETHBPair.connect(wallet);
          tx = await WETHBPairw.approve(router.address, MaxUint256)
          await tx.wait();
          
          tx = await WETHAPair.mint(wallet.address, overrides)
          await tx.wait()
          tx = await pairAB.mint(wallet.address, overrides)
          await tx.wait();
          tx = await WETHBPair.mint(wallet.address, overrides)
          await tx.wait();
        }
        
        tx = await WETHAPair.sync(overrides)
        await tx.wait();
        tx = await pairAB.sync(overrides)
        await tx.wait();
        tx = await WETHBPair.sync(overrides)
        await tx.wait();
      })

      it('succeeds on swap with greater output than input', async () => {
        
        const wallet = wallets[0]
        const routerw = router.connect(wallet);

        let tx = await token0.transfer(pairAB.address, NegligibleAmount)
        await tx.wait();
        tx = await token1.transfer(pairAB.address, Token1Token0Amount)
        await tx.wait();
        tx = await pairAB.mint(wallet.address, overrides)
        await tx.wait();
        tx = await pairAB.sync(overrides)
        await tx.wait();

        // let balance = await provider.getBalance(wallet.address);
        // console.log('Starting Balance: ' + formatEther(balance));

        tx = await routerw.swapETHForETH(
          swapMinAmountOut,
          [WETH.address, token0.address, token1.address, WETH.address],
          wallet.address,
          MaxUint256,
          {
            ...overrides,
            value: swapAmountIn
          }
        )
        await tx.wait();

        // balance = await provider.getBalance(wallet.address);
        // console.log('Ending Balance: ' + formatEther(balance));
      })

      it('fails on swap with lesser output than input', async () => {
        
        const wallet = wallets[0]
        const routerw = router.connect(wallet);

        await expect(
          routerw.swapETHForETH(
            swapMinAmountOut,
            [WETH.address, token0.address, token1.address, WETH.address],
            wallet.address,
            MaxUint256,
            {
              ...overrides,
              value: swapAmountIn
            }
          )
        ).to.be.revertedWith('UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT')
      })

      it('succeeds when a swap has been made to cause a lot of slippage', async () => {
        
        // token0needed = (((100*100) / (100 - 10)) - 100) * 1.003 = 11.1444444444

        // let balance = await provider.getBalance(wallets[1].address);
        // console.log('Starting Balance: ' + formatEther(balance));

        await token1.approve(router.address, MaxUint256)

        const routerw1 = router.connect(wallets[0]);
        const routerw2 = router.connect(wallets[1]);

        const outputAmount = expandTo18Decimals(20)

        let tx1 = routerw1.swapTokensForExactTokens(
          outputAmount,
          MaxUint256,
          [token1.address, token0.address],
          wallets[0].address,
          MaxUint256,
          {
            gasLimit: 1000000
          }
        )

        let tx2 = routerw2.swapETHForETH(
          swapMinAmountOut,
          [WETH.address, token0.address, token1.address, WETH.address],
          wallets[1].address,
          MaxUint256,
          {
            gasLimit: 1000000,
            value: swapAmountIn
          }
        )

        await (await tx1).wait();
        await (await tx2).wait();

        // balance = await provider.getBalance(wallets[1].address);
        // console.log('Ending Balance: ' + formatEther(balance));
      })

      it('fails when a swap has been that does not cause enough slippage', async () => {
        
        // token0needed = (((100*100) / (100 - 10)) - 100) * 1.003 = 11.1444444444

        // let balance = await provider.getBalance(wallets[1].address);
        // console.log('Starting Balance: ' + formatEther(balance));

        await token1.approve(router.address, MaxUint256)

        const routerw1 = router.connect(wallets[0]);
        const routerw2 = router.connect(wallets[1]);

        const outputAmount = expandTo18Decimals(10)

        let tx1 = routerw1.swapTokensForExactTokens(
          outputAmount,
          MaxUint256,
          [token1.address, token0.address],
          wallets[0].address,
          MaxUint256,
          {
            gasLimit: 1000000
          }
        )

        await expect(
          routerw2.swapETHForETH(
            swapMinAmountOut,
            [WETH.address, token0.address, token1.address, WETH.address],
            wallets[1].address,
            MaxUint256,
            {
              gasLimit: 1000000,
              value: swapAmountIn
            }
          )
        ).to.be.revertedWith('UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT')

        await (await tx1).wait();

        // balance = await provider.getBalance(wallets[1].address);
        // console.log('Ending Balance: ' + formatEther(balance));
      })
    })
  })
})
