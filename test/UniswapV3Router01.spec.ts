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
  let token2: Contract
  let WETH: Contract
  let factory: Contract
  let router: Contract
  let pairAB: Contract
  let pairBC: Contract
  let WETHAPair: Contract
  let WETHCPair: Contract
  let routerEventEmitter: Contract

  
  beforeEach(async function() {
    const fixture = await loadFixture(v2Fixture)
    token0 = fixture.token0
    token1 = fixture.token1
    token2 = fixture.token2
    WETH = fixture.WETH
    factory = fixture.factoryV2
    router = fixture.router03
    pairAB = fixture.pairAB
    pairBC = fixture.pairBC
    WETHAPair = fixture.WETHAPair
    WETHCPair = fixture.WETHCPair
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
        const token0Amount = expandTo18Decimals(1)
        const ETHAmount = expandTo18Decimals(4)
        const expectedLiquidity = expandTo18Decimals(2)

        const token0w = token0.connect(wallet);
        const routerw = router.connect(wallet);

        const WETHAPairToken0 = await WETHAPair.token0()
        await token0w.approve(router.address, MaxUint256)
        await expect(
          routerw.addLiquidityETH(
            token0.address,
            token0Amount,
            token0Amount,
            ETHAmount,
            wallet.address,
            MaxUint256,
            { ...overrides, value: ETHAmount }
          )
        )
          .to.emit(WETHAPair, 'Transfer')
          .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
          .to.emit(WETHAPair, 'Transfer')
          .withArgs(AddressZero, wallet.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
          .to.emit(WETHAPair, 'Sync')
          .withArgs(
            WETHAPairToken0 === token0.address ? token0Amount : ETHAmount,
            WETHAPairToken0 === token0.address ? ETHAmount : token0Amount
          )
          .to.emit(WETHAPair, 'Mint')
          .withArgs(
            router.address,
            WETHAPairToken0 === token0.address ? token0Amount : ETHAmount,
            WETHAPairToken0 === token0.address ? ETHAmount : token0Amount
          )

        expect(await WETHAPair.balanceOf(wallet.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
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
        const token0Amount = expandTo18Decimals(1)
        const ETHAmount = expandTo18Decimals(4)

        const WETHAPair = WETHAPair.connect(wallet);
        const routerw = router.connect(wallet);

        await token0.transfer(WETHAPair.address, token0Amount)
        await WETH.deposit({ value: ETHAmount })
        await WETH.transfer(WETHAPair.address, ETHAmount)
        await WETHAPair.mint(wallet.address, overrides)

        const expectedLiquidity = expandTo18Decimals(2)
        const WETHAPairToken0 = await WETHAPair.token0()
        await WETHAPair.approve(router.address, MaxUint256)
        await expect(
          routerw.removeLiquidityETH(
            token0.address,
            expectedLiquidity.sub(MINIMUM_LIQUIDITY),
            0,
            0,
            wallet.address,
            MaxUint256,
            overrides
          )
        )
          .to.emit(WETHAPair, 'Transfer')
          .withArgs(wallet.address, WETHAPair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
          .to.emit(WETHAPair, 'Transfer')
          .withArgs(WETHAPair.address, AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
          .to.emit(WETH, 'Transfer')
          .withArgs(WETHAPair.address, router.address, ETHAmount.sub(2000))
          .to.emit(token0, 'Transfer')
          .withArgs(WETHAPair.address, router.address, token0Amount.sub(500))
          .to.emit(token0, 'Transfer')
          .withArgs(router.address, wallet.address, token0Amount.sub(500))
          .to.emit(WETHAPair, 'Sync')
          .withArgs(
          WETHAPairToken0 === token0.address ? 500 : 2000,
            WETHAPairToken0 === token0.address ? 2000 : 500
          )
          .to.emit(WETHAPair, 'Burn')
          .withArgs(
            router.address,
            WETHAPairToken0 === token0.address ? token0Amount.sub(500) : ETHAmount.sub(2000),
            WETHAPairToken0 === token0.address ? ETHAmount.sub(2000) : token0Amount.sub(500),
            router.address
          )

        expect(await WETHAPair.balanceOf(wallet.address)).to.eq(0)
        const totalSupplytoken0 = await token0.totalSupply()
        const totalSupplyWETH = await WETH.totalSupply()
        expect(await token0.balanceOf(wallet.address)).to.eq(totalSupplytoken0.sub(500))
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
      const token0Amount = expandTo18Decimals(10)
      const ETHAmount = expandTo18Decimals(5)
      const swapAmount = expandTo18Decimals(1)
      const expectedOutputAmount = bigNumberify('1662497915624478906')

      beforeEach(async () => {
        await token0.transfer(WETHAPair.address, token0Amount)
        await WETH.deposit({ value: ETHAmount })
        await WETH.transfer(WETHAPair.address, ETHAmount)

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          await WETHAPair.mint(wallet.address, overrides)
        }

        await token0.approve(router.address, MaxUint256)
      })

      it('happy path', async () => {
        const WETHAPairToken0 = await WETHAPair.token0()

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerw = router.connect(wallet);

          await expect(
            routerw.swapExactETHForTokens(0, [WETH.address, token0.address], wallet.address, MaxUint256, {
              ...overrides,
              value: swapAmount
            })
          )
            .to.emit(WETH, 'Transfer')
            .withArgs(router.address, WETHAPair.address, swapAmount)
            .to.emit(token0, 'Transfer')
            .withArgs(WETHAPair.address, wallet.address, expectedOutputAmount)
            .to.emit(WETHAPair, 'Sync')
            .withArgs(
              WETHAPairToken0 === token0.address
                ? token0Amount.sub(expectedOutputAmount)
                : ETHAmount.add(swapAmount),
              WETHAPairToken0 === token0.address
                ? ETHAmount.add(swapAmount)
                : token0Amount.sub(expectedOutputAmount)
            )
            .to.emit(WETHAPair, 'Swap')
            .withArgs(
              router.address,
              WETHAPairToken0 === token0.address ? 0 : swapAmount,
              WETHAPairToken0 === token0.address ? swapAmount : 0,
              WETHAPairToken0 === token0.address ? expectedOutputAmount : 0,
              WETHAPairToken0 === token0.address ? 0 : expectedOutputAmount,
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
              [WETH.address, token0.address],
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

          const token0Amount = expandTo18Decimals(10)
          const ETHAmount = expandTo18Decimals(5)
          await token0.transfer(WETHAPair.address, token0Amount)
          await WETH.deposit({ value: ETHAmount })
          await WETH.transfer(WETHAPair.address, ETHAmount)
          await WETHAPair.mint(wallet.address, overrides)

          // ensure that setting price{0,1}CumulativeLast for the first time doesn't affect our gas math
          await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
          await pairAB.sync(overrides)

          const swapAmount = expandTo18Decimals(1)
          await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
          const tx = await routerw.swapExactETHForTokens(
            0,
            [WETH.address, token0.address],
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
      const token0Amount = expandTo18Decimals(5)
      const ETHAmount = expandTo18Decimals(10)
      const swapAmount = expandTo18Decimals(1)
      const expectedOutputAmount = bigNumberify('1662497915624478906')

      beforeEach(async () => {
        await token0.transfer(WETHAPair.address, token0Amount)
        await WETH.deposit({ value: ETHAmount })
        await WETH.transfer(WETHAPair.address, ETHAmount)

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          await WETHAPair.mint(wallet.address, overrides)
        }
      })

      it('happy path', async () => {
        await token0.approve(router.address, MaxUint256)
        const WETHAPairToken0 = await WETHAPair.token0()

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerw = router.connect(wallet);

          await expect(
            routerw.swapExactTokensForETH(
              swapAmount,
              0,
              [token0.address, WETH.address],
              wallet.address,
              MaxUint256,
              overrides
            )
          )
            .to.emit(token0, 'Transfer')
            .withArgs(wallet.address, WETHAPair.address, swapAmount)
            .to.emit(WETH, 'Transfer')
            .withArgs(WETHAPair.address, router.address, expectedOutputAmount)
            .to.emit(WETHAPair, 'Sync')
            .withArgs(
              WETHAPairToken0 === token0.address
                ? token0Amount.add(swapAmount)
                : ETHAmount.sub(expectedOutputAmount),
              WETHAPairToken0 === token0.address
                ? ETHAmount.sub(expectedOutputAmount)
                : token0Amount.add(swapAmount)
            )
            .to.emit(WETHAPair, 'Swap')
            .withArgs(
              router.address,
              WETHAPairToken0 === token0.address ? swapAmount : 0,
              WETHAPairToken0 === token0.address ? 0 : swapAmount,
              WETHAPairToken0 === token0.address ? 0 : expectedOutputAmount,
              WETHAPairToken0 === token0.address ? expectedOutputAmount : 0,
              router.address
            )
        }
      })

      it('amounts', async () => {
        await token0.approve(routerEventEmitter.address, MaxUint256)

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerEventEmitterw = routerEventEmitter.connect(wallet);

          await expect(
            routerEventEmitterw.swapExactTokensForETH(
              router.address,
              swapAmount,
              0,
              [token0.address, WETH.address],
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
      const token0Amount = expandTo18Decimals(10)
      const ETHAmount = expandTo18Decimals(5)
      const expectedSwapAmount = bigNumberify('557227237267357629')
      const outputAmount = expandTo18Decimals(1)

      beforeEach(async () => {
        await token0.transfer(WETHAPair.address, token0Amount)
        await WETH.deposit({ value: ETHAmount })
        await WETH.transfer(WETHAPair.address, ETHAmount)

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          await WETHAPair.mint(wallet.address, overrides)
        }
      })

      it('happy path', async () => {
        const WETHAPairToken0 = await WETHAPair.token0()

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerw = router.connect(wallet);

          await expect(
            routerw.swapETHForExactTokens(
              outputAmount,
              [WETH.address, token0.address],
              wallet.address,
              MaxUint256,
              {
                ...overrides,
                value: expectedSwapAmount
              }
            )
          )
            .to.emit(WETH, 'Transfer')
            .withArgs(router.address, WETHAPair.address, expectedSwapAmount)
            .to.emit(token0, 'Transfer')
            .withArgs(WETHAPair.address, wallet.address, outputAmount)
            .to.emit(WETHAPair, 'Sync')
            .withArgs(
              WETHAPairToken0 === token0.address
                ? token0Amount.sub(outputAmount)
                : ETHAmount.add(expectedSwapAmount),
              WETHAPairToken0 === token0.address
                ? ETHAmount.add(expectedSwapAmount)
                : token0Amount.sub(outputAmount)
            )
            .to.emit(WETHAPair, 'Swap')
            .withArgs(
              router.address,
              WETHAPairToken0 === token0.address ? 0 : expectedSwapAmount,
              WETHAPairToken0 === token0.address ? expectedSwapAmount : 0,
              WETHAPairToken0 === token0.address ? outputAmount : 0,
              WETHAPairToken0 === token0.address ? 0 : outputAmount,
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
              [WETH.address, token0.address],
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



    describe('swapETHForETH', () => {
      const token0Amount = expandTo18Decimals(10)
      const token1Amount = expandTo18Decimals(10)
      const token2Amount = expandTo18Decimals(10)
      const ETHAmount = expandTo18Decimals(5)
      const swapAmount = expandTo18Decimals(1)
      const expectedOutputAmount = bigNumberify('1662497915624478906')
    
      beforeEach('approve the swap contract to spend any amount of both tokens', async () => {
        let tx;

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]

          await WETH.deposit({ value: ETHAmount })
          await WETH.transfer(WETHAPair.address, ETHAmount)

          tx = await token0.transfer(WETHAPair.address, token0Amount)
          await tx.wait();
          tx = await WETHAPair.mint(wallet.address, overrides)
          await tx.wait();
          tx = await WETHAPair.sync(overrides)
          await tx.wait();

          tx = await token0.transfer(pairAB.address, token0Amount)
          await tx.wait();
          tx = await token1.transfer(pairAB.address, token1Amount)
          await tx.wait();
          tx = await pairAB.mint(wallet.address, overrides)
          await tx.wait();
          tx = await pairAB.sync(overrides)
          await tx.wait();

          tx = await token1.transfer(pairBC.address, token1Amount)
          await tx.wait();
          tx = await token2.transfer(pairBC.address, token2Amount)
          await tx.wait();
          tx = await pairBC.mint(wallet.address, overrides)
          await tx.wait();
          tx = await pairBC.sync(overrides)
          await tx.wait();

          tx = await token2.transfer(WETHCPair.address, token0Amount)
          await tx.wait();
          tx = await WETHCPair.mint(wallet.address, overrides)
          await tx.wait();
          tx = await WETHCPair.sync(overrides)
          await tx.wait();

          const WETHAPairw = WETHAPair.connect(wallet);
          tx = await WETHAPairw.approve(router.address, MaxUint256)
          await tx.wait();
          const token0w = token0.connect(wallet);
          tx = await token0w.approve(router.address, MaxUint256)
          await tx.wait();
          const token1w = token1.connect(wallet);
          tx = await token1w.approve(router.address, MaxUint256)
          await tx.wait();
          const token2w = token2.connect(wallet);
          tx = await token2w.approve(router.address, MaxUint256)
          await tx.wait();
          const WETHCPairw = WETHCPair.connect(wallet);
          tx = await WETHCPairw.approve(router.address, MaxUint256)
          await tx.wait();
        }
      })

      it('happy path', async () => {
        const WETHAPairToken0 = await WETHAPair.token0()

        for (let i = 0; i++; i < wallets.length) {
          const wallet = wallets[i]
          const routerw = router.connect(wallet);

          await expect(
            routerw.swapExactETHForTokens(0, [WETH.address, token0.address], wallet.address, MaxUint256, {
              ...overrides,
              value: swapAmount
            })
          )
            .to.emit(WETH, 'Transfer')
            .withArgs(router.address, WETHAPair.address, swapAmount)
            .to.emit(token0, 'Transfer')
            .withArgs(WETHAPair.address, wallet.address, expectedOutputAmount)
            .to.emit(WETHAPair, 'Sync')
            .withArgs(
              WETHAPairToken0 === token0.address
                ? token0Amount.sub(expectedOutputAmount)
                : ETHAmount.add(swapAmount),
              WETHAPairToken0 === token0.address
                ? ETHAmount.add(swapAmount)
                : token0Amount.sub(expectedOutputAmount)
            )
            .to.emit(WETHAPair, 'Swap')
            .withArgs(
              router.address,
              WETHAPairToken0 === token0.address ? 0 : swapAmount,
              WETHAPairToken0 === token0.address ? swapAmount : 0,
              WETHAPairToken0 === token0.address ? expectedOutputAmount : 0,
              WETHAPairToken0 === token0.address ? 0 : expectedOutputAmount,
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
              [WETH.address, token0.address],
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
    })
  })
})
