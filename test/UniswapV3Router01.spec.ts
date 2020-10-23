import chai, { expect } from 'chai'
import { Wallet, Contract } from 'ethers'
import { AddressZero, Zero, MaxUint256 } from 'ethers/constants'
import { BigNumber, bigNumberify } from 'ethers/utils'
import { solidity, MockProvider, createFixtureLoader } from 'ethereum-waffle'
import { ecsign } from 'ethereumjs-util'

import { expandTo18Decimals, getApprovalDigest, mineBlock, MINIMUM_LIQUIDITY } from './shared/utilities'
import { v2Fixture } from './shared/fixtures'

chai.use(solidity)

const overrides = {
  gasLimit: 9999999
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
  let WETHPartner: Contract
  let factory: Contract
  let router: Contract
  let pairAB: Contract
  let pairBC: Contract
  let WETHPair: Contract
  let routerEventEmitter: Contract

  
  beforeEach(async function() {
    const fixture = await loadFixture(v2Fixture)
    token0 = fixture.token0
    token1 = fixture.token1
    WETH = fixture.WETH
    WETHPartner = fixture.WETHPartner
    factory = fixture.factoryV2
    router = fixture.router03
    pairAB = fixture.pairAB
    pairBC = fixture.pairBC
    WETHPair = fixture.WETHPair
    routerEventEmitter = fixture.routerEventEmitter
  })

  afterEach(async function() {
    expect(await provider.getBalance(router.address)).to.eq(Zero)
  })

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

    it('addLiquidity', async () => {

      for (let i = 0; i++; i < wallets.length) {

        const wallet = wallets[i]

        const token0Amount = expandTo18Decimals(1)
        const token1Amount = expandTo18Decimals(4)

        const expectedLiquidity = expandTo18Decimals(2)
        await token0.approve(router.address, MaxUint256)
        await token1.approve(router.address, MaxUint256)
        await expect(
          router.addLiquidity(
            token0.address,
            token1.address,
            token0Amount,
            token1Amount,
            0,
            0,
            wallet.address,
            MaxUint256,
            overrides
          )
        )
          .to.emit(token0, 'Transfer')
          .withArgs(wallet.address, pairAB.address, token0Amount)
          .to.emit(token1, 'Transfer')
          .withArgs(wallet.address, pairAB.address, token1Amount)
          .to.emit(pairAB, 'Transfer')
          .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
          .to.emit(pairAB, 'Transfer')
          .withArgs(AddressZero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
          .to.emit(pairAB, 'Sync')
          .withArgs(token0Amount, token1Amount)
          .to.emit(pairAB, 'Mint')
          .withArgs(router.address, token0Amount, token1Amount)

        expect(await pairAB.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      }
    })

    it('addLiquidityETH', async () => {

      for (let i = 0; i++; i < wallets.length) {

        const wallet = wallets[i]
        const WETHPartnerAmount = expandTo18Decimals(1)
        const ETHAmount = expandTo18Decimals(4)
        const expectedLiquidity = expandTo18Decimals(2)

        const WETHPartnerw = WETHPartner.connect(wallet);
        const routerw = router.connect(wallet);

        const WETHPairToken0 = await WETHPair.token0()
        await WETHPartnerw.approve(router.address, MaxUint256)
        await expect(
          routerw.addLiquidityETH(
            WETHPartner.address,
            WETHPartnerAmount,
            WETHPartnerAmount,
            ETHAmount,
            wallet.address,
            MaxUint256,
            { ...overrides, value: ETHAmount }
          )
        )
          .to.emit(WETHPair, 'Transfer')
          .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
          .to.emit(WETHPair, 'Transfer')
          .withArgs(AddressZero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
          .to.emit(WETHPair, 'Sync')
          .withArgs(
            WETHPairToken0 === WETHPartner.address ? WETHPartnerAmount : ETHAmount,
            WETHPairToken0 === WETHPartner.address ? ETHAmount : WETHPartnerAmount
          )
          .to.emit(WETHPair, 'Mint')
          .withArgs(
            router.address,
            WETHPairToken0 === WETHPartner.address ? WETHPartnerAmount : ETHAmount,
            WETHPairToken0 === WETHPartner.address ? ETHAmount : WETHPartnerAmount
          )

        expect(await WETHPair.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
      }
    })

    async function addLiquidity(token0Amount: BigNumber, token1Amount: BigNumber, wallet: Wallet, pair: Contract) {
      let tx;
      tx = await token0.transfer(pair.address, token0Amount)
      await tx.wait();
      tx = await token1.transfer(pair.address, token1Amount)
      await tx.wait();
      tx = await pair.mint(wallet.address, overrides)
      await tx.wait();
    }

    it('removeLiquidity', async () => {

      for (let i = 0; i++; i < wallets.length) {

        const wallet = wallets[i]
        const token0Amount = expandTo18Decimals(1)
        const token1Amount = expandTo18Decimals(4)

        const pair = pairAB.connect(wallet);
        const routerw = router.connect(wallet);

        let tx = await pairAB.approve(routerw.address, MaxUint256)
        await tx.wait();
        await addLiquidity(token0Amount, token1Amount, wallet, pair)

        const expectedLiquidity = expandTo18Decimals(2)
        
        await expect(
          routerw.removeLiquidity(
            token0.address,
            token1.address,
            expectedLiquidity.sub(MINIMUM_LIQUIDITY),
            0,
            0,
            wallet.address,
            MaxUint256,
            overrides
          )
        )
          .to.emit(pair, 'Transfer')
          .withArgs(wallet.address, pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
          .to.emit(pair, 'Transfer')
          .withArgs(pair.address, AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
          .to.emit(token0, 'Transfer')
          .withArgs(pair.address, wallet.address, token0Amount.sub(500))
          .to.emit(token1, 'Transfer')
          .withArgs(pair.address, wallet.address, token1Amount.sub(2000))
          .to.emit(pair, 'Sync')
          .withArgs(500, 2000)
          .to.emit(pair, 'Burn')
          .withArgs(routerw.address, token0Amount.sub(500), token1Amount.sub(2000), wallet.address)

        expect(await pair.balanceOf(wallet.address)).to.eq(0)
        const totalSupplyToken0 = await token0.totalSupply()
        const totalSupplyToken1 = await token1.totalSupply()
        expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplyToken0.sub(500))
        expect(await token1.balanceOf(wallet.address)).to.eq(totalSupplyToken1.sub(2000))
      }
    })

    it('removeLiquidityETH', async () => {

      for (let i = 0; i++; i < wallets.length) {

        const wallet = wallets[i]
        const WETHPartnerAmount = expandTo18Decimals(1)
        const ETHAmount = expandTo18Decimals(4)

        const WETHPairw = WETHPair.connect(wallet);
        const routerw = router.connect(wallet);

        await WETHPartner.transfer(WETHPairw.address, WETHPartnerAmount)
        await WETH.deposit({ value: ETHAmount })
        await WETH.transfer(WETHPairw.address, ETHAmount)
        await WETHPairw.mint(wallet.address, overrides)

        const expectedLiquidity = expandTo18Decimals(2)
        const WETHPairToken0 = await WETHPairw.token0()
        await WETHPairw.approve(router.address, MaxUint256)
        await expect(
          routerw.removeLiquidityETH(
            WETHPartner.address,
            expectedLiquidity.sub(MINIMUM_LIQUIDITY),
            0,
            0,
            wallet.address,
            MaxUint256,
            overrides
          )
        )
          .to.emit(WETHPairw, 'Transfer')
          .withArgs(wallet.address, WETHPairw.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
          .to.emit(WETHPairw, 'Transfer')
          .withArgs(WETHPairw.address, AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
          .to.emit(WETH, 'Transfer')
          .withArgs(WETHPairw.address, router.address, ETHAmount.sub(2000))
          .to.emit(WETHPartner, 'Transfer')
          .withArgs(WETHPairw.address, router.address, WETHPartnerAmount.sub(500))
          .to.emit(WETHPartner, 'Transfer')
          .withArgs(router.address, wallet.address, WETHPartnerAmount.sub(500))
          .to.emit(WETHPairw, 'Sync')
          .withArgs(
          WETHPairToken0 === WETHPartner.address ? 500 : 2000,
            WETHPairToken0 === WETHPartner.address ? 2000 : 500
          )
          .to.emit(WETHPairw, 'Burn')
          .withArgs(
            router.address,
            WETHPairToken0 === WETHPartner.address ? WETHPartnerAmount.sub(500) : ETHAmount.sub(2000),
            WETHPairToken0 === WETHPartner.address ? ETHAmount.sub(2000) : WETHPartnerAmount.sub(500),
            router.address
          )

        expect(await WETHPairw.balanceOf(wallet.address)).to.eq(0)
        const totalSupplyWETHPartner = await WETHPartner.totalSupply()
        const totalSupplyWETH = await WETH.totalSupply()
        expect(await WETHPartner.balanceOf(wallet.address)).to.eq(totalSupplyWETHPartner.sub(500))
        expect(await WETH.balanceOf(wallet.address)).to.eq(totalSupplyWETH.sub(2000))
      }
    })

    describe('swapExactTokensForTokens', () => {
      const token0Amount = expandTo18Decimals(5)
      const token1Amount = expandTo18Decimals(10)
      const swapAmount = expandTo18Decimals(1)
      const expectedOutputAmount = bigNumberify('1662497915624478906')

      beforeEach(async () => {
        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          await addLiquidity(token0Amount, token1Amount, wallet, pairAB)
        }
        await token0.approve(router.address, MaxUint256)
      })

      it('happy path', async () => {
        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerw = router.connect(wallet);

          await expect(
            routerw.swapExactTokensForTokens(
              swapAmount,
              0,
              [token0.address, token1.address],
              wallet.address,
              MaxUint256,
              overrides
            )
          )
            .to.emit(token0, 'Transfer')
            .withArgs(wallet.address, pairAB.address, swapAmount)
            .to.emit(token1, 'Transfer')
            .withArgs(pairAB.address, wallet.address, expectedOutputAmount)
            .to.emit(pairAB, 'Sync')
            .withArgs(token0Amount.add(swapAmount), token1Amount.sub(expectedOutputAmount))
            .to.emit(pairAB, 'Swap')
            .withArgs(router.address, swapAmount, 0, 0, expectedOutputAmount, wallet.address)
        }
      })

      it('amounts', async () => {
        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerEventEmitterw = routerEventEmitter.connect(wallet);

          await token0.approve(routerEventEmitter.address, MaxUint256)
          await expect(
            routerEventEmitterw.swapExactTokensForTokens(
              router.address,
              swapAmount,
              0,
              [token0.address, token1.address],
              wallet.address,
              MaxUint256,
              overrides
            )
          )
            .to.emit(routerEventEmitter, 'Amounts')
            .withArgs([swapAmount, expectedOutputAmount])
        }
      })

      it('gas', async () => {
        // ensure that setting price{0,1}CumulativeLast for the first time doesn't affect our gas math
        await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
        await pairAB.sync(overrides)

        await token0.approve(router.address, MaxUint256)
        await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerw = router.connect(wallet);

          const tx = await routerw.swapExactTokensForTokens(
            swapAmount,
            0,
            [token0.address, token1.address],
            wallet.address,
            MaxUint256,
            overrides
          )
          const receipt = await tx.wait()
          expect(receipt.gasUsed).to.eq(101898)
        }
      }).retries(3)
    })

    describe('swapTokensForExactTokens', () => {
      const token0Amount = expandTo18Decimals(5)
      const token1Amount = expandTo18Decimals(10)
      const expectedSwapAmount = bigNumberify('557227237267357629')
      const outputAmount = expandTo18Decimals(1)

      beforeEach(async () => {
        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          await addLiquidity(token0Amount, token1Amount, wallet, pairAB)
        }
      })

      it('happy path', async () => {
        await token0.approve(router.address, MaxUint256)

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerw = router.connect(wallet);

          await expect(
            routerw.swapTokensForExactTokens(
              outputAmount,
              MaxUint256,
              [token0.address, token1.address],
              wallet.address,
              MaxUint256,
              overrides
            )
          )
            .to.emit(token0, 'Transfer')
            .withArgs(wallet.address, pairAB.address, expectedSwapAmount)
            .to.emit(token1, 'Transfer')
            .withArgs(pairAB.address, wallet.address, outputAmount)
            .to.emit(pairAB, 'Sync')
            .withArgs(token0Amount.add(expectedSwapAmount), token1Amount.sub(outputAmount))
            .to.emit(pairAB, 'Swap')
            .withArgs(router.address, expectedSwapAmount, 0, 0, outputAmount, wallet.address)
        }
      })

      it('amounts', async () => {
        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerEventEmitterw = routerEventEmitter.connect(wallet);

          await token0.approve(routerEventEmitter.address, MaxUint256)
          await expect(
            routerEventEmitterw.swapTokensForExactTokens(
              router.address,
              outputAmount,
              MaxUint256,
              [token0.address, token1.address],
              wallet.address,
              MaxUint256,
              overrides
            )
          )
            .to.emit(routerEventEmitter, 'Amounts')
            .withArgs([expectedSwapAmount, outputAmount])
        }
      })
    })

    describe('swapExactETHForTokens', () => {
      const WETHPartnerAmount = expandTo18Decimals(10)
      const ETHAmount = expandTo18Decimals(5)
      const swapAmount = expandTo18Decimals(1)
      const expectedOutputAmount = bigNumberify('1662497915624478906')

      beforeEach(async () => {
        await WETHPartner.transfer(WETHPair.address, WETHPartnerAmount)
        await WETH.deposit({ value: ETHAmount })
        await WETH.transfer(WETHPair.address, ETHAmount)

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          await WETHPair.mint(wallet.address, overrides)
        }

        await token0.approve(router.address, MaxUint256)
      })

      it('happy path', async () => {
        const WETHPairToken0 = await WETHPair.token0()

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerw = router.connect(wallet);

          await expect(
            routerw.swapExactETHForTokens(0, [WETH.address, WETHPartner.address], wallet.address, MaxUint256, {
              ...overrides,
              value: swapAmount
            })
          )
            .to.emit(WETH, 'Transfer')
            .withArgs(router.address, WETHPair.address, swapAmount)
            .to.emit(WETHPartner, 'Transfer')
            .withArgs(WETHPair.address, wallet.address, expectedOutputAmount)
            .to.emit(WETHPair, 'Sync')
            .withArgs(
              WETHPairToken0 === WETHPartner.address
                ? WETHPartnerAmount.sub(expectedOutputAmount)
                : ETHAmount.add(swapAmount),
              WETHPairToken0 === WETHPartner.address
                ? ETHAmount.add(swapAmount)
                : WETHPartnerAmount.sub(expectedOutputAmount)
            )
            .to.emit(WETHPair, 'Swap')
            .withArgs(
              router.address,
              WETHPairToken0 === WETHPartner.address ? 0 : swapAmount,
              WETHPairToken0 === WETHPartner.address ? swapAmount : 0,
              WETHPairToken0 === WETHPartner.address ? expectedOutputAmount : 0,
              WETHPairToken0 === WETHPartner.address ? 0 : expectedOutputAmount,
              wallet.address
            )
        }
      })

      it('amounts', async () => {
        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerEventEmitterw = routerEventEmitter.connect(wallet);

          await expect(
            routerEventEmitterw.swapExactETHForTokens(
              router.address,
              0,
              [WETH.address, WETHPartner.address],
              wallet.address,
              MaxUint256,
              {
                ...overrides,
                value: swapAmount
              }
            )
          )
            .to.emit(routerEventEmitter, 'Amounts')
            .withArgs([swapAmount, expectedOutputAmount])
        }
      })

      it('gas', async () => {
        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerw = router.connect(wallet);

          const WETHPartnerAmount = expandTo18Decimals(10)
          const ETHAmount = expandTo18Decimals(5)
          await WETHPartner.transfer(WETHPair.address, WETHPartnerAmount)
          await WETH.deposit({ value: ETHAmount })
          await WETH.transfer(WETHPair.address, ETHAmount)
          await WETHPair.mint(wallet.address, overrides)

          // ensure that setting price{0,1}CumulativeLast for the first time doesn't affect our gas math
          await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
          await pairAB.sync(overrides)

          const swapAmount = expandTo18Decimals(1)
          await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
          const tx = await routerw.swapExactETHForTokens(
            0,
            [WETH.address, WETHPartner.address],
            wallet.address,
            MaxUint256,
            {
              ...overrides,
              value: swapAmount
            }
          )
          const receipt = await tx.wait()
          expect(receipt.gasUsed).to.eq(138770)
        }
      }).retries(3)
    })

    describe('swapExactTokensForETH', () => {
      const WETHPartnerAmount = expandTo18Decimals(5)
      const ETHAmount = expandTo18Decimals(10)
      const swapAmount = expandTo18Decimals(1)
      const expectedOutputAmount = bigNumberify('1662497915624478906')

      beforeEach(async () => {
        await WETHPartner.transfer(WETHPair.address, WETHPartnerAmount)
        await WETH.deposit({ value: ETHAmount })
        await WETH.transfer(WETHPair.address, ETHAmount)

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          await WETHPair.mint(wallet.address, overrides)
        }
      })

      it('happy path', async () => {
        await WETHPartner.approve(router.address, MaxUint256)
        const WETHPairToken0 = await WETHPair.token0()

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerw = router.connect(wallet);

          await expect(
            routerw.swapExactTokensForETH(
              swapAmount,
              0,
              [WETHPartner.address, WETH.address],
              wallet.address,
              MaxUint256,
              overrides
            )
          )
            .to.emit(WETHPartner, 'Transfer')
            .withArgs(wallet.address, WETHPair.address, swapAmount)
            .to.emit(WETH, 'Transfer')
            .withArgs(WETHPair.address, router.address, expectedOutputAmount)
            .to.emit(WETHPair, 'Sync')
            .withArgs(
              WETHPairToken0 === WETHPartner.address
                ? WETHPartnerAmount.add(swapAmount)
                : ETHAmount.sub(expectedOutputAmount),
              WETHPairToken0 === WETHPartner.address
                ? ETHAmount.sub(expectedOutputAmount)
                : WETHPartnerAmount.add(swapAmount)
            )
            .to.emit(WETHPair, 'Swap')
            .withArgs(
              router.address,
              WETHPairToken0 === WETHPartner.address ? swapAmount : 0,
              WETHPairToken0 === WETHPartner.address ? 0 : swapAmount,
              WETHPairToken0 === WETHPartner.address ? 0 : expectedOutputAmount,
              WETHPairToken0 === WETHPartner.address ? expectedOutputAmount : 0,
              router.address
            )
        }
      })

      it('amounts', async () => {
        await WETHPartner.approve(routerEventEmitter.address, MaxUint256)

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerEventEmitterw = routerEventEmitter.connect(wallet);

          await expect(
            routerEventEmitterw.swapExactTokensForETH(
              router.address,
              swapAmount,
              0,
              [WETHPartner.address, WETH.address],
              wallet.address,
              MaxUint256,
              overrides
            )
          )
            .to.emit(routerEventEmitter, 'Amounts')
            .withArgs([swapAmount, expectedOutputAmount])
        }
      })
    })

    describe('swapETHForExactTokens', () => {
      const WETHPartnerAmount = expandTo18Decimals(10)
      const ETHAmount = expandTo18Decimals(5)
      const expectedSwapAmount = bigNumberify('557227237267357629')
      const outputAmount = expandTo18Decimals(1)

      beforeEach(async () => {
        await WETHPartner.transfer(WETHPair.address, WETHPartnerAmount)
        await WETH.deposit({ value: ETHAmount })
        await WETH.transfer(WETHPair.address, ETHAmount)

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          await WETHPair.mint(wallet.address, overrides)
        }
      })

      it('happy path', async () => {
        const WETHPairToken0 = await WETHPair.token0()

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerw = router.connect(wallet);

          await expect(
            routerw.swapETHForExactTokens(
              outputAmount,
              [WETH.address, WETHPartner.address],
              wallet.address,
              MaxUint256,
              {
                ...overrides,
                value: expectedSwapAmount
              }
            )
          )
            .to.emit(WETH, 'Transfer')
            .withArgs(router.address, WETHPair.address, expectedSwapAmount)
            .to.emit(WETHPartner, 'Transfer')
            .withArgs(WETHPair.address, wallet.address, outputAmount)
            .to.emit(WETHPair, 'Sync')
            .withArgs(
              WETHPairToken0 === WETHPartner.address
                ? WETHPartnerAmount.sub(outputAmount)
                : ETHAmount.add(expectedSwapAmount),
              WETHPairToken0 === WETHPartner.address
                ? ETHAmount.add(expectedSwapAmount)
                : WETHPartnerAmount.sub(outputAmount)
            )
            .to.emit(WETHPair, 'Swap')
            .withArgs(
              router.address,
              WETHPairToken0 === WETHPartner.address ? 0 : expectedSwapAmount,
              WETHPairToken0 === WETHPartner.address ? expectedSwapAmount : 0,
              WETHPairToken0 === WETHPartner.address ? outputAmount : 0,
              WETHPairToken0 === WETHPartner.address ? 0 : outputAmount,
              wallet.address
            )
        }
      })

      it('amounts', async () => {

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerEventEmitterw = routerEventEmitter.connect(wallet);

          await expect(
            routerEventEmitterw.swapETHForExactTokens(
              router.address,
              outputAmount,
              [WETH.address, WETHPartner.address],
              wallet.address,
              MaxUint256,
              {
                ...overrides,
                value: expectedSwapAmount
              }
            )
          )
            .to.emit(routerEventEmitter, 'Amounts')
            .withArgs([expectedSwapAmount, outputAmount])
        }
      })
    })
  })
})
